interface PromptPanelProps {
  prompt: string;
  onPromptChange: (value: string) => void;
  onCompile: () => void;
  loading: boolean;
  error: string | null;
}

const DEMO_TEMPLATES = [
  {
    title: "Payment Retry",
    prompt:
      "When a payment fails, retry 3 times at 1-hour intervals, then notify the account owner via email and flag the transaction for review",
  },
  {
    title: "User Onboarding",
    prompt:
      "When a new user registers, send a welcome email, wait 24 hours, then send an onboarding checklist, if not completed in 3 days escalate to support team",
  },
  {
    title: "Invoice Processing",
    prompt:
      "When an invoice is uploaded, extract line items, match against open purchase orders, flag discrepancies over 5%, and notify the assigned approver",
  },
];

const Spinner = () => (
  <svg
    className="h-5 w-5 animate-spin text-white"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
    />
  </svg>
);

const PromptPanel = ({
  prompt,
  onPromptChange,
  onCompile,
  loading,
  error,
}: PromptPanelProps) => {
  const canCompile = prompt.length >= 10 && !loading;

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <div className="flex flex-col gap-2">
        <label
          htmlFor="prompt"
          className="text-sm font-medium text-gray-300"
        >
          Describe your workflow
        </label>
        <textarea
          id="prompt"
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          placeholder="Describe your workflow in plain English..."
          rows={6}
          maxLength={500}
          className="w-full resize-none rounded-lg border border-gray-700 bg-gray-800 p-3 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">
            {prompt.length}/500
          </span>
          {prompt.length > 0 && prompt.length < 10 && (
            <span className="text-xs text-yellow-500">
              Min 10 characters
            </span>
          )}
        </div>
      </div>

      <button
        onClick={onCompile}
        disabled={!canCompile}
        className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? (
          <>
            <Spinner />
            Compiling...
          </>
        ) : (
          "Compile Workflow"
        )}
      </button>

      {error && (
        <div className="rounded-lg border border-red-800 bg-red-900/30 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="mt-2 border-t border-gray-800 pt-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-gray-500">
          Or try a template
        </p>
        <div className="flex flex-col gap-2">
          {DEMO_TEMPLATES.map((t) => (
            <button
              key={t.title}
              onClick={() => onPromptChange(t.prompt)}
              className="rounded-lg border border-gray-700 bg-gray-800/50 p-3 text-left transition-colors hover:border-gray-600 hover:bg-gray-800"
            >
              <span className="text-sm font-medium text-gray-200">
                {t.title}
              </span>
              <p className="mt-1 line-clamp-2 text-xs text-gray-500">
                {t.prompt}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PromptPanel;
