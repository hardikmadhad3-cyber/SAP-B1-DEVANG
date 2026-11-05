import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FreightChargesModal from './FreightChargesModal';
import { fetchFreightDistributionRules, fetchFreightProjects } from '../../api/freightLookupApi';
jest.mock('../../api/freightLookupApi',()=>({fetchFreightDistributionRules:jest.fn(),fetchFreightProjects:jest.fn()}));
beforeEach(()=>{fetchFreightDistributionRules.mockResolvedValue([]);fetchFreightProjects.mockResolvedValue([]);});
const codes=[{Code:'GST',Name:'GST',Rate:12}];
const renderFreight=()=>{const onApply=jest.fn();render(<FreightChargesModal isOpen onClose={jest.fn()} onApply={onApply} freightCharges={[{ExpnsCode:1,ExpnsName:'Transport',LineTotal:0,TaxCode:''}]} taxCodes={codes}/>);return onApply;};
test('entering only a freight amount can be applied with no manual tax-code selection',async()=>{
 const onApply=renderFreight();const row=(await screen.findByDisplayValue('Transport')).closest('tr');
 fireEvent.change(row.cells[6].querySelector('input'),{target:{value:'100'}});
 fireEvent.click(screen.getByRole('button',{name:'Update'}));
 expect(onApply).toHaveBeenCalledWith(expect.objectContaining({totalNet:100,totalTax:0,totalGross:100,rows:expect.arrayContaining([expect.objectContaining({expnsCode:1,netAmount:100,taxCode:''})])}));
 expect(screen.queryByText(/Tax Code is required/i)).not.toBeInTheDocument();
 await waitFor(()=>expect(fetchFreightProjects).toHaveBeenCalled());
});
test('selected freight tax still calculates, and clearing it allows amount-only application',async()=>{
 const onApply=renderFreight();const row=(await screen.findByDisplayValue('Transport')).closest('tr');
 fireEvent.change(row.cells[6].querySelector('input'),{target:{value:'100'}});
 fireEvent.change(row.cells[3].querySelector('select'),{target:{value:'GST'}});
 fireEvent.click(screen.getByRole('button',{name:'Update'}));
 expect(onApply).toHaveBeenLastCalledWith(expect.objectContaining({totalNet:100,totalTax:12,totalGross:112}));
 fireEvent.change(row.cells[3].querySelector('select'),{target:{value:''}});
 fireEvent.click(screen.getByRole('button',{name:'Update'}));
 expect(onApply).toHaveBeenLastCalledWith(expect.objectContaining({totalNet:100,totalTax:0,totalGross:100}));
 await waitFor(()=>expect(fetchFreightProjects).toHaveBeenCalled());
});
