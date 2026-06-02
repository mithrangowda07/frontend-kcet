const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-3 rounded-md shadow-md border
                      bg-white text-slate-900
                      dark:bg-slate-800 dark:text-gray-100 dark:border-slate-700">
        <p className="font-semibold mb-1">{label}</p>

        {payload.map((item, index) => (
          <p key={index} className="text-sm" style={{ color: item.color }}>
            {item.name} : {item.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default CustomTooltip;