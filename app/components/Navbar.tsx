"use client";
import { useSidebar } from "../context/SidebarContext";
import { NavbarProps } from "../lib/types/types";
import UserMenu from "./userMenu";

const Navbar: React.FC<NavbarProps> = ({
  theme,
  handleTheme,
  handleCloseSession,
}) => {
  const { isSidebarOpen } = useSidebar();

  return (
    <header className="bg-white dark:bg-black text-gray_b dark:text-white w-full px-10 py-5 relative shadow-sm shadow-gray_xl dark:shadow-gray_m transition-all duration-200">
      <nav
        className={`${
          isSidebarOpen ? "ml-64" : "ml-30"
        } transition-all duration-200 flex items-center justify-between h-10`}
      >
        <h1 className="text-2xl">MarketMix</h1>
        <div className="flex items-center gap-10">
          <UserMenu
            theme={theme}
            handleTheme={handleTheme}
            handleCloseSession={handleCloseSession}
          />
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
