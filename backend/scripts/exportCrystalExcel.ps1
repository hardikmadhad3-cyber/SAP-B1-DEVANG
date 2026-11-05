$ErrorActionPreference = 'Stop'
$report = $null
try {
  # Credentials arrive over stdin; never place them in command arguments or files.
  $request = [Console]::In.ReadToEnd() | ConvertFrom-Json
  $engineRoot = Join-Path $env:WINDIR 'Microsoft.NET\assembly\GAC_MSIL\CrystalDecisions.CrystalReports.Engine'
  $engine = Get-ChildItem -LiteralPath $engineRoot -Recurse -Filter 'CrystalDecisions.CrystalReports.Engine.dll' | Sort-Object FullName -Descending | Select-Object -First 1
  if (-not $engine) { throw 'Crystal Reports .NET runtime is not installed.' }
  Add-Type -Path $engine.FullName
  $report = New-Object CrystalDecisions.CrystalReports.Engine.ReportDocument
  $report.Load($request.reportPath)
  $documents = @($report) + @($report.Subreports)
  foreach ($document in $documents) {
    foreach ($table in $document.Database.Tables) {
      $oldDatabase = $table.LogOnInfo.ConnectionInfo.DatabaseName
      $oldPrefix = '^\[?' + [regex]::Escape($oldDatabase) + '\]?\.'
      if ($oldDatabase -and $oldDatabase -ne $request.sql.database) {
        $nativeTable = $document.ReportClientDocument.DatabaseController.Database.Tables | Where-Object { $_.Name -eq $table.Name } | Select-Object -First 1
        if ($nativeTable.CommandText -and $nativeTable.CommandText -match ('(?i)\[?' + [regex]::Escape($oldDatabase) + '\]?\.')) {
          throw 'The report command explicitly references a different company database. Update the SAP report connection before exporting.'
        }
        if ($table.Location -match $oldPrefix) { throw 'The report table is qualified with another company database. Update its SAP report connection before exporting.' }
      }
    }
    foreach ($connection in $document.DataSourceConnections) {
      $connection.SetConnection($request.sql.server, $request.sql.database, $request.sql.user, $request.sql.password)
    }
  }
  # Refresh clears saved data and parameter values. Apply the validated request afterwards.
  $dateHeaders = @()
  if ($request.commandOverride) {
    if ($documents.Count -ne 1 -or $report.Database.Tables.Count -ne 1) { throw 'Unsupported corrected report data source.' }
    foreach ($section in $report.ReportDefinition.Sections) {
      foreach ($object in $section.ReportObjects) {
        if ([string]$object.Kind -ne 'TextObject') { continue }
        $hasDate = $false
        foreach ($parameter in $request.parameters) {
          if ($parameter.type -eq 'date' -and $object.Text.Contains(('{?' + $parameter.name + '}'))) { $hasDate = $true }
        }
        if ($hasDate) {
          if ($object.Text -match '\{(?!\?)[^}]+\}') { throw 'A corrected report heading requires an explicit field mapping.' }
          $dateHeaders += @{ name = $object.Name; text = $object.Text }
        }
      }
    }
  }
  $report.Refresh()
  if ($request.commandOverride) {
    # Only a server-owned company/template-hash-verified profile supplies this SQL.
    # User filter values stay bound parameters; credentials are never saved.
    $builder = New-Object System.Data.SqlClient.SqlConnectionStringBuilder
    $builder['Data Source'] = $request.sql.server
    $builder['Initial Catalog'] = $request.sql.database
    $builder['User ID'] = $request.sql.user
    $builder['Password'] = $request.sql.password
    $builder['Encrypt'] = [bool]$request.sql.encrypt
    $builder['TrustServerCertificate'] = [bool]$request.sql.trustServerCertificate
    $connection = New-Object System.Data.SqlClient.SqlConnection($builder.ConnectionString)
    try {
      $command = $connection.CreateCommand()
      $command.CommandTimeout = 90
      $command.CommandText = [string]$request.commandOverride
      $index = 0
      foreach ($parameter in $request.parameters) {
        $token = '{?' + $parameter.name + '}'
        if (-not $command.CommandText.Contains($token)) { continue }
        $name = '@webParameter' + $index
        $command.CommandText = $command.CommandText.Replace($token, ('(' + $name + ')'))
        if ($parameter.type -eq 'date') {
          $value = [DateTime]::ParseExact($parameter.value, 'yyyy-MM-dd', [Globalization.CultureInfo]::InvariantCulture)
        } else { $value = $parameter.value }
        $command.Parameters.AddWithValue($name, $value) | Out-Null
        $index++
      }
      if ($command.CommandText -match '\{\?') { throw 'Missing corrected-report query parameter.' }
      $dataTable = New-Object System.Data.DataTable($report.Database.Tables[0].Name)
      $adapter = New-Object System.Data.SqlClient.SqlDataAdapter($command)
      $adapter.Fill($dataTable) | Out-Null
      $report.SetDataSource($dataTable)
      # Typed-table binding removes command parameters. Restore their displayed
      # dates without changing other headings or the Crystal selection filters.
      foreach ($heading in $dateHeaders) {
        $text = $heading.text
        foreach ($parameter in $request.parameters) {
          $value = [string]$parameter.value
          if ($parameter.type -eq 'date' -and $value) {
            $value = [DateTime]::ParseExact($value, 'yyyy-MM-dd', [Globalization.CultureInfo]::InvariantCulture).ToString('dd/MM/yyyy')
          }
          $text = $text.Replace(('{?' + $parameter.name + '}'), $value)
        }
        $report.ReportDefinition.ReportObjects[$heading.name].Text = $text
      }
    } finally {
      if ($adapter) { $adapter.Dispose() }
      $connection.Dispose()
    }
  }
  foreach ($field in $report.DataDefinition.ParameterFields) {
    $parameter = @($request.parameters | Where-Object { $_.name -ceq $field.Name } | Select-Object -First 1)
    if (-not $parameter.Count) { $parameter = @($request.parameters | Where-Object { $_.name.Trim() -ceq $field.Name.Trim() } | Select-Object -First 1) }
    $values = New-Object CrystalDecisions.Shared.ParameterValues
    if (($field.Name -replace '[^a-zA-Z0-9]', '') -match '^(Schema|SchemaName|Database|DatabaseName|DBName|CompanyDB|CompanyDatabase)$') {
      $values.AddValue([string]$request.sql.database) | Out-Null
    } elseif ($parameter.Count -and $parameter[0].value -ne '') {
      $value = $parameter[0].value
      if ($parameter[0].type -eq 'date') { $value = [DateTime]::ParseExact($value, 'yyyy-MM-dd', [Globalization.CultureInfo]::InvariantCulture) }
      elseif ($parameter[0].type -eq 'number') { $value = [double]$value }
      $values.AddValue($value) | Out-Null
    } elseif ($field.IsOptionalPrompt) {
      # Blank optional filters mean no value, not an empty-string equality filter.
      $values.IsNoValue = $true
    } else { throw ('Missing required report parameter: ' + $field.Name) }
    $field.ApplyCurrentValues($values)
  }
  if (-not $request.format -or $request.format -eq 'data-only') {
    $format = New-Object CrystalDecisions.Shared.ExcelDataOnlyFormatOptions
    $format.ExportObjectFormatting = $true
    $format.ExportImages = $false
    # SAP KBA 1301817: preserve relative positions and column alignment, and
    # do not simplify multi-line headers, otherwise headings can shift columns.
    $format.MaintainRelativeObjectPosition = $true
    $format.MaintainColumnAlignment = $true
    $format.SimplifyPageHeaders = $false
    $format.ExportPageHeaderAndPageFooter = $true
    $format.ExcelUseConstantColumnWidth = $false
    $format.ExcelAreaType = [CrystalDecisions.Shared.AreaSectionKind]::Detail
    $report.ExportOptions.ExportFormatOptions = $format
    $destination = New-Object CrystalDecisions.Shared.DiskFileDestinationOptions
    $destination.DiskFileName = $request.outputPath
    $report.ExportOptions.ExportDestinationType = [CrystalDecisions.Shared.ExportDestinationType]::DiskFile
    $report.ExportOptions.ExportFormatType = [CrystalDecisions.Shared.ExportFormatType]::ExcelWorkbook
    $report.ExportOptions.DestinationOptions = $destination
    $report.Export($report.ExportOptions)
  } elseif ($request.format -eq 'report-layout') {
    $report.ExportToDisk([CrystalDecisions.Shared.ExportFormatType]::XLSXPagebased, $request.outputPath)
  } elseif ($request.format -eq 'pdf') {
    $report.ExportToDisk([CrystalDecisions.Shared.ExportFormatType]::PortableDocFormat, $request.outputPath)
  } else { throw 'Unsupported Excel export format.' }
  [Console]::Out.Write('OK')
} catch {
  # Do not emit connection strings, parameter contents or PowerShell source lines.
  [Console]::Error.Write('Native Crystal Excel export failed. Check the installed database driver, report connection and parameter configuration.')
  exit 1
} finally {
  if ($report) { $report.Close(); $report.Dispose() }
}

