interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: any;
    color: string;
    payload?: any;
  }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-3 rounded-md shadow-md border
                      bg-white text-slate-900
                      dark:bg-slate-800 dark:text-gray-100 dark:border-slate-700">
        <p className="font-semibold mb-1">{label}</p>

        {payload.map((item, index) => {
          const tooltipKey = `tooltip${item.name}`;
          const displayVal = item.payload && item.payload[tooltipKey] !== undefined
            ? item.payload[tooltipKey]
            : item.value;

          return (
            <p key={index} className="text-sm" style={{ color: item.color }}>
              {item.name} : {displayVal}
            </p>
          );
        })}
      </div>
    );
  }
  return null;
};

export default CustomTooltip;