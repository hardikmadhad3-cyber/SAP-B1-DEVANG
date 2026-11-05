// Order/quotation quantities are proposals, not a universal copied-line cap.
// Keep base links and let SAP enforce the active company's final posting rules.
const allowsBaseQuantityIncrease = (targetType, baseType) => {
  const sources = { 15: [17, 23], 13: [17], 20: [22], 18: [22] };
  return (sources[Number(targetType)] || []).includes(Number(baseType));
};

export { allowsBaseQuantityIncrease };
