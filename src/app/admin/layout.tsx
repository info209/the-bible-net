import { Metadata } from 'next';
import { ReactNode } from "react";

export const metadata: Metadata = {
    title: {
        default: "Admin Portal",
        template: "%s | Admin Portal | The Bible Net"
    }
};

export default function AdminLayout({ children }: { children: ReactNode }) {
    return <>{children}</>;
}
