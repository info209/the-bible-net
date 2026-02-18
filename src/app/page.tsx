import AppHeader from "./components/AppHeader";
import BibleReaderPage from "./components/BibleReaderPage";
import ChapterContent from "./components/ChapterContent";
import HomePage from "./components/HomePage";
import "./globals.css"
export default function Page() {
  return (
    <>
    <AppHeader/>
  <ChapterContent />
  <BibleReaderPage/>
  </>
  )  
};
