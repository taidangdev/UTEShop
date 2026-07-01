interface QuantitySelectorProps {
    value: number;
    min?: number;
    max: number;
    disabled?: boolean;
    onChange: (value: number) => void;
}

export default function QuantitySelector({
    value,
    min = 1,
    max,
    disabled = false,
    onChange
}: QuantitySelectorProps) {
    const decrease = () => {
        if (disabled || value <= min) return;
        onChange(value - 1);
    };

    const increase = () => {
        if (disabled || value >= max) return;
        onChange(value + 1);
    };

    return (
        <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-on-surface-variant">Quantity</span>
            <div className="flex h-12 items-center rounded-full border border-outline-variant/40 bg-surface-container-low">
                <button
                    type="button"
                    onClick={decrease}
                    disabled={disabled || value <= min}
                    className="flex h-12 w-12 items-center justify-center rounded-l-full text-on-surface transition hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Decrease quantity"
                >
                    <span className="material-symbols-outlined text-[20px]">remove</span>
                </button>
                <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={value}
                    disabled={disabled}
                    onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        if (val === '') {
                            onChange(0);
                        } else {
                            const num = Number(val);
                            onChange(Math.min(num, max));
                        }
                    }}
                    onBlur={() => {
                        if (value < min) {
                            onChange(min);
                        }
                    }}
                    className="w-12 text-center text-base font-bold text-on-surface border-none bg-transparent outline-none focus:ring-0 p-0"
                />
                <button
                    type="button"
                    onClick={increase}
                    disabled={disabled || value >= max}
                    className="flex h-12 w-12 items-center justify-center rounded-r-full text-on-surface transition hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Increase quantity"
                >
                    <span className="material-symbols-outlined text-[20px]">add</span>
                </button>
            </div>
            {max > 0 && max <= 10 && (
                <span className="text-xs text-on-surface-variant">Max {max}</span>
            )}
        </div>
    );
}
