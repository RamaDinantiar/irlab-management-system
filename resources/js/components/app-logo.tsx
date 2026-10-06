/** Logo IR Lab — Figma "LOGO IR": ikon 56px + teks JetBrains Mono ExtraBold 20px. */
export default function AppLogo() {
    return (
        <>
            <img
                src="/images/logo-ir.png"
                alt=""
                className="size-12 shrink-0 transition-[width,height] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-data-[collapsible=icon]:size-9"
            />
            <span className="font-mono text-h3 leading-tight font-extrabold whitespace-pre text-white transition-opacity duration-200 ease-out group-data-[collapsible=icon]:opacity-0">
                {'Information\nRetrieval'}
            </span>
        </>
    );
}
