import * as React from "react";
import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";

// small note: just logging bad routes, kinda handy during debug :)
const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 route hit:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center animate-fade-in">
        <h1 className="mb-3 text-6xl font-bold text-foreground">404</h1>

        {/* lil friendly message */}
        <p className="mb-6 text-lg text-muted-foreground">
          Oops! The page you're trying to reach doesn’t exist anymore (or maybe never did 😅).
        </p>

        <Link
          to="/"
          className="inline-flex items-center rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground hover:opacity-90 transition-all shadow-elevated"
        >
          Go back Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
