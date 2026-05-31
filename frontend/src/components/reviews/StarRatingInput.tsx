interface StarRatingInputProps {
    value: number;
    onChange: (rating: number) => void;
    size?: number;
    disabled?: boolean;
}

export default function StarRatingInput({
    value,
    onChange,
    size = 32,
    disabled = false
}: StarRatingInputProps) {
    return (
        <div className="flex items-center gap-1" role="group" aria-label="Rating">
            {[1, 2, 3, 4, 5].map((star) => {
                const filled = value >= star;
                return (
                    <button
                        key={star}
                        type="button"
                        disabled={disabled}
                        onClick={() => onChange(star)}
                        className={`transition hover:scale-110 disabled:cursor-not-allowed disabled:opacity-50 ${
                            filled ? 'text-primary' : 'text-outline-variant'
                        }`}
                        aria-label={`${star} star${star > 1 ? 's' : ''}`}
                    >
                        <span
                            className={`material-symbols-outlined ${
                                filled ? 'material-symbols-filled' : ''
                            }`}
                            style={{ fontSize: size }}
                        >
                            star
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
