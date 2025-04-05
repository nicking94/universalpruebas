import { Sun, Moon, LogOut } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { UserMenuProps } from "../lib/types/types";
import logo from "../../public/logo.jpg";
import Image from "next/image";

const UserMenu: React.FC<UserMenuProps> = ({
  theme,
  handleTheme,
  handleCloseSession,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const userIconRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        userIconRef.current &&
        !userIconRef.current.contains(event.target as Node)
      ) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="relative">
      <div
        ref={userIconRef}
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="cursor-pointer flex bg-gray_xl rounded-full p-1 text-gray_b w-14 h-14"
      >
        <Image
          className="shadow-lg shadow-gray_m dark:shadow-gray_xl rounded-full"
          src={logo}
          alt="User Logo"
        />
      </div>
      {isMenuOpen && (
        <div
          ref={menuRef}
          className="absolute right-0 w-48 bg-white dark:bg-black shadow-lg rounded-sm shadow-gray_m mt-2 z-50"
        >
          <button
            onClick={() => {
              handleTheme();
              setIsMenuOpen(false);
            }}
            className="cursor-pointer flex items-center w-full px-4 py-2 text-sm text-gray_b dark:text-white hover:bg-gray-100 dark:hover:bg-gray_b transition-all duration-200 rounded-t-md"
          >
            {theme === "dark" ? (
              <Sun className="mr-2" />
            ) : (
              <Moon className="mr-2" />
            )}
            {theme === "dark" ? "Modo Claro" : "Modo Oscuro"}
          </button>
          <button
            onClick={() => {
              handleCloseSession();
              setIsMenuOpen(false);
            }}
            className="cursor-pointer flex items-center w-full px-4 py-2 text-sm text-gray_b dark:text-white hover:bg-gray-100 dark:hover:bg-gray_b transition-all duration-200 rounded-b-md"
          >
            <LogOut className="mr-2" />
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
