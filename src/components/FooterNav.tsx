// src/components/FooterNav.tsx
'use client';
import Link from 'next/link';
import homeIcon from '../../public/assets/plain_home_icon.svg';
import coloredhomeIcon from '../../public/assets/color_home_icon.svg';
import Image from 'next/image';
import bible_book from '../../public/assets/plain_Book_icons.svg'
import colored_bible_book from '../../public/assets/colored_book_icons.svg'
import libraryIcon from '../../public/assets/plain_library_icon.svg'
import coloredlibraryIcon from '../../public/assets/colored_library_icons.svg'
import discoverIcon from '../../public/assets/plain_discover_icon.svg'
import coloreddiscoverIcon from '../../public/assets/colored_discover_icon.svg'
import { usePathname } from "next/navigation";

export default function FooterNav() {
    const pathname = usePathname();
    const isActiveRoute = (route: string): boolean => pathname.startsWith(route);
    const isHome = pathname === "/";
    const isBible = isActiveRoute("/bible");
    const isLibrary = isActiveRoute("/library");
    const isDiscover = isActiveRoute("/discover");


    return (
        <nav className="fixed bottom-0 left-0 right-0 h-20 bg-white shadow-lg z-40">
            {/* Match max width with Header and Reader page (max-w-5xl) */}
            <div   className="
                                  mx-4
                                  h-full
                                  px-4 sm:px-6
                                  flex items-center justify-between
                                  md:mx-auto md:w-[62%]
                                  lg:mx-auto lg:w-[40%]
                                  max-w-5xl
                                ">
                  {/* className="lg:ml-[583px] lg:w-[40%] md:w-full max-w-5xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between"> */}
                {/* mx-auto w-[86%] max-w-5xl h-full px-4 sm:px-6 flex items-center justify-between */}
                {/* md:ml-[150px] lg:ml-[166px] lg:w-[68%] md:w-[59%] w-[80%] flex bg-transparent border-none shadow-none */}
<Link
                href="/"
                className={`group flex flex-col items-center 
                ${isHome ? "text-[#006A6F]" : "text-[rgba(49,57,58,0.4)]"} 
                hover:text-[#006A6F]`}
>
    <span className="text-2xl flex items-center justify-center">

        <Image
            src={homeIcon}
            alt="home"
            width={24}
            height={24}
            className={
            isHome
              ? "hidden" 
              : "block group-hover:hidden transition duration-200"
          }
        />

        <Image
            src={coloredhomeIcon}
            alt="home active"
            width={24}
            height={24}
            className={
            isHome
              ? "block" 
              : "hidden group-hover:block transition duration-200"
          }
        />
        
    </span>

    <span className="text-xs mt-1">Home</span>
</Link>

<Link
                href="/bible"
                className={`group flex flex-col items-center 
                ${isBible ? "text-[#006A6F]" : "text-[rgba(49,57,58,0.4)]"} 
                hover:text-[#006A6F]`}
>
  <Image
            src={bible_book}
            alt="Bible"
            width={24}
            height={24}
            className={
            isBible
              ? "hidden" 
              : "block group-hover:hidden transition duration-200"
          }
        />

        <Image
            src={colored_bible_book}
            alt="Bible active"
            width={24}
            height={24}
            className={
            isBible
              ? "block" 
              : "hidden group-hover:block transition duration-200"
          }
        />
  <span className="text-xs mt-1">Bible</span>
</Link>

<Link
                href="/library"
                className={`group flex flex-col items-center 
                ${isLibrary ? "text-[#006A6F]" : "text-[rgba(49,57,58,0.4)]"} 
                hover:text-[#006A6F]`}                >
                    
         <Image
            src={libraryIcon}
            alt="Library"
            width={24}
            height={24}
            className={
            isLibrary
              ? "hidden" 
              : "block group-hover:hidden transition duration-200"
          }
        />

        <Image
            src={coloredlibraryIcon}
            alt="Library active"
            width={24}
            height={24}
            className={
            isLibrary
              ? "block" 
              : "hidden group-hover:block transition duration-200"
          }
        />
                    <span className="text-xs mt-1">Library</span>
</Link>

<Link
                href="/discover"
                                className={`group flex flex-col items-center 
                ${isDiscover ? "text-[#006A6F]" : "text-[rgba(49,57,58,0.4)]"} 
                hover:text-[#006A6F]`}                >
                    
        <Image
            src={discoverIcon}
            alt="Discover"
            width={24}
            height={24}
            className={
            isDiscover
              ? "hidden" 
              : "block group-hover:hidden transition duration-200"
          }
        />

        <Image
            src={coloreddiscoverIcon}
            alt="Discover active"
            width={24}
            height={24}
            className={
            isDiscover
              ? "block" 
              : "hidden group-hover:block transition duration-200"
          }
        />
                    <span className="text-xs mt-1">Discover</span>
</Link>
            </div>
        </nav>
    );
}
