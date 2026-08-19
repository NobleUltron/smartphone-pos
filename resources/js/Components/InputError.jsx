export default function InputError({ message, className = '', ...props }) {
    return message ? (
        <p
            {...props}
            className={'text-xs font-bold text-rose-400 bg-rose-950/60 border border-rose-800/60 px-3 py-1.5 rounded-lg mt-1.5 ' + className}
        >
            {message}
        </p>
    ) : null;
}
