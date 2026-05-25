type CheckoutStep = 1 | 2;

interface CheckoutStepperProps {
    currentStep: CheckoutStep;
}

export default function CheckoutStepper({ currentStep }: CheckoutStepperProps) {
    const step1Done = currentStep >= 2;

    return (
        <div className="mx-auto mb-16 w-full max-w-2xl px-4">
            <div className="flex items-center justify-between">
                <div className="flex flex-col items-center gap-2">
                    <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full font-bold transition-all ${
                            step1Done
                                ? 'bg-primary-container text-on-primary shadow-md'
                                : 'bg-primary text-on-primary shadow-md'
                        }`}
                    >
                        {step1Done ? (
                            <span className="material-symbols-outlined text-[20px]">check</span>
                        ) : (
                            '1'
                        )}
                    </div>
                    <span
                        className={`text-sm font-medium ${
                            currentStep === 1 ? 'text-primary' : 'text-on-surface'
                        }`}
                    >
                        Information
                    </span>
                </div>

                <div
                    className={`mx-4 h-0.5 flex-grow transition-all duration-500 ${
                        step1Done ? 'bg-primary' : 'bg-surface-container-highest'
                    }`}
                />

                <div className="flex flex-col items-center gap-2">
                    <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full font-bold transition-all ${
                            currentStep === 2
                                ? 'bg-primary text-on-primary shadow-md ring-4 ring-primary/10'
                                : 'bg-surface-container-highest text-outline'
                        }`}
                    >
                        2
                    </div>
                    <span
                        className={`text-sm font-medium ${
                            currentStep === 2 ? 'font-bold text-primary' : 'text-outline'
                        }`}
                    >
                        Payment
                    </span>
                </div>
            </div>
        </div>
    );
}
