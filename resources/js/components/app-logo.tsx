/** Logo IR Lab — Figma "LOGO IR": ikon 56px + teks JetBrains Mono ExtraBold 20px. */
export default function AppLogo() {
    return (
        <>
            <img
                src="/images/logo-ir.png"
                alt=""
                className="size-12 shrink-0 group-data-[collapsible=icon]:size-9"
            />
            <span className="font-mono text-h3 leading-tight font-extrabold whitespace-pre text-white group-data-[collapsible=icon]:hidden">
                {'Information\nRetrieval'}
            </span>
        </>
    );
}
