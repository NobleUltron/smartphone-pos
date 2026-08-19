export default function InputLabel({
    value,
    className = '',
    children,
    ...props
}) {
    return (
        <label
            {...props}
            className={
                `block text-xs font-bold uppercase tracking-wider text-slate-300 dark:text-slate-200 mb-1.5 ` +
                className
            }
        >
            {value ? value : children}
        </label>
    );
}
