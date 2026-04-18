import EmailPasswordReact from 'supertokens-auth-react/recipe/emailpassword';
import SessionReact from 'supertokens-auth-react/recipe/session';
import { appInfo } from './appInfo';
import { useRouter } from "next/navigation";

const routerInfo: { router?: ReturnType<typeof useRouter>; pathName?: string } = {};

export function setRouter(
    router: ReturnType<typeof useRouter>,
    pathName: string,
) {
    routerInfo.router = router;
    routerInfo.pathName = pathName;
}

export const frontendConfig = () => {
    return {
        appInfo,
        recipeList: [
            EmailPasswordReact.init({
                signInAndUpFeature: {
                    signUpForm: {
                        formFields: [
                            {
                                id: "email",
                                label: "Email",
                                placeholder: "analyst@stockfreq.ai",
                            },
                            {
                                id: "password",
                                label: "Password",
                            },
                        ],
                    },
                },
                style: `
                    /* Strip completely to bare bones form */
                    [data-supertokens~=container] {
                        font-family: 'Inter', sans-serif !important;
                        background: transparent !important;
                        border: none !important;
                        box-shadow: none !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        width: 100% !important;
                    }
                    [data-supertokens~=row] {
                        padding: 0 !important;
                        box-shadow: none !important;
                        background: transparent !important;
                    }
                    [data-supertokens~=headerTitle] {
                        font-family: 'Inter', sans-serif !important;
                        font-weight: 700 !important;
                        text-transform: uppercase !important;
                        letter-spacing: 0.1em !important;
                        color: #f8fafc !important;
                        font-size: 24px !important;
                        text-align: center !important;
                        width: 100% !important;
                    }
                    [data-supertokens~=label], [data-supertokens~=headerSubtitle] {
                        font-family: monospace !important;
                        color: #94a3b8 !important;
                    }
                    [data-supertokens~=label] {
                        text-transform: uppercase !important;
                        letter-spacing: 0.1em !important;
                        font-size: 11px !important;
                    }
                    [data-supertokens~=input] {
                        font-family: monospace !important;
                        background-color: #0f172a !important;
                        border: 1px solid #334155 !important;
                        color: #f8fafc !important;
                        border-radius: 2px !important;
                        padding: 10px 12px !important;
                    }
                    [data-supertokens~=input]:focus {
                        border-color: #3b82f6 !important;
                        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3) !important;
                        outline: none !important;
                    }
                    [data-supertokens~=button] {
                        font-family: 'Inter', sans-serif !important;
                        font-weight: 600 !important;
                        text-transform: uppercase !important;
                        letter-spacing: 0.1em !important;
                        border-radius: 2px !important;
                        background-color: #2563eb !important;
                        color: #ffffff !important;
                        transition: all 0.2s ease !important;
                        border: none !important;
                        margin-top: 20px !important;
                        box-shadow: 0 0 10px rgba(59, 130, 246, 0.5) !important;
                    }
                    [data-supertokens~=button]:hover {
                        background-color: #3b82f6 !important;
                        box-shadow: 0 0 15px rgba(59, 130, 246, 0.7) !important;
                    }
                    [data-supertokens~=superTokensBranding] {
                        display: none !important;
                    }
                    [data-supertokens~=secondaryText] {
                        color: #64748b !important;
                    }
                    [data-supertokens~=link] {
                        color: #3b82f6 !important;
                    }
                    [data-supertokens~=divider] {
                        border-color: #334155 !important;
                    }
                    /* Fix browser autofill background in dark mode */
                    input:-webkit-autofill,
                    input:-webkit-autofill:hover, 
                    input:-webkit-autofill:focus, 
                    input:-webkit-autofill:active {
                        -webkit-box-shadow: 0 0 0 30px #0f172a inset !important;
                        -webkit-text-fill-color: #f8fafc !important;
                        transition: background-color 5000s ease-in-out 0s !important;
                    }
                `,
            }),
            SessionReact.init(),
        ],
        windowHandler: (original: any) => ({
            ...original,
            location: {
                ...original.location,
                getPathName: () => routerInfo.pathName!,
                assign: (url: any) => routerInfo.router!.push(url.toString()),
                setHref: (url: any) => routerInfo.router!.push(url.toString()),
            },
        }),
    };
};
