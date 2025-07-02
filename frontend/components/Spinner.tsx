"use client"

export function Spinner() {
  return (
    <div className="loader"></div>
  );
}

// CSS for the spinner (you can add this to your global CSS file)
<style jsx>{`
  .loader {
    border: 4px solid rgba(0, 0, 0, 0.1);
    border-left-color: #4f46e5; /* Change this to your primary color */
    border-radius: 50%;
    width: 24px;
    height: 24px;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`}</style>
