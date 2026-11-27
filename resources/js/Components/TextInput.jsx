import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

export default forwardRef(function TextInput(
    { type = 'text', className = '', isFocused = false, ...props },
    ref,
) {
    const localRef = useRef(null);

    useImperativeHandle(ref, () => ({
        focus: () => localRef.current?.focus(),
    }));

    useEffect(() => {
        if (isFocused) {
            localRef.current?.focus();
        }
    }, [isFocused]);

    const hasCustomPaddingX = /\b(p|px|pl|pr)-/.test(className);
    const hasCustomPaddingY = /\b(p|py|pt|pb)-/.test(className);

    return (
        <input
            {...props}
            type={type}
            className={
                `rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/90 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm transition-all ${hasCustomPaddingX ? '' : 'px-3.5'} ${hasCustomPaddingY ? '' : 'py-2.5'} ` +
                className
            }
            ref={localRef}
        />
    );
});
