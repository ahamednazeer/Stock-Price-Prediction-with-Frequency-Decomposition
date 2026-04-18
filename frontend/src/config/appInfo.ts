export const appInfo = {
    appName: "StockFreq AI",
    // Auth APIs live on the FastAPI backend (Python)
    apiDomain: process.env.NEXT_PUBLIC_API_DOMAIN || "http://localhost:8000",
    // Website (Next.js frontend)
    websiteDomain: process.env.NEXT_PUBLIC_WEBSITE_DOMAIN || "http://localhost:3000",
    apiBasePath: "/auth",
    websiteBasePath: "/auth",
};
