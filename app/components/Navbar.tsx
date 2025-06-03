// components/Navbar.tsx
"use client";
import Image from "next/image";
import { useSidebar } from "../context/SidebarContext";
import { NavbarProps } from "../lib/types/types";
import UserMenu from "./userMenu";
import logo from "../../public/logo.png";
import { useRubro } from "../context/RubroContext";
import Select from "react-select";

const rubroOptions = [
  { value: "todos", label: "Todos" },
  { value: "comercio", label: "Comercio" },
  { value: "indumentaria", label: "Indumentaria" },
];

const Navbar: React.FC<NavbarProps> = ({
  theme,
  handleTheme,
  handleCloseSession,
}) => {
  const { isSidebarOpen } = useSidebar();
  const { rubro, setRubro } = useRubro();

  const selectedRubro = rubroOptions.find((option) => option.value === rubro);

  return (
    <header className="bg-white dark:bg-black text-gray_b dark:text-white w-full px-10 py-5 relative shadow-sm shadow-gray_xl dark:shadow-gray_m transition-all duration-200">
      <nav
        className={`${
          isSidebarOpen ? "ml-64" : "ml-30"
        } transition-all duration-200 flex items-center justify-between h-10`}
      >
        <div className="flex items-center gap-2">
          <Image className="rounded-full w-8 h-8" src={logo} alt="User Logo" />
          <h1 className="text-lg italic">Universal App</h1>
        </div>

        <div className="flex items-center gap-6">
          <div className=" flex items-center gap-2 bg-gradient-to-bl from-blue_m to-blue_b p-2 rounded-sm">
            <p className="dark:text-white italic text-md font-normal text-white">
              Rubro:
            </p>
            <Select
              options={rubroOptions}
              value={selectedRubro}
              onChange={(selectedOption) => {
                if (selectedOption) {
                  setRubro(
                    selectedOption.value as
                      | "todos"
                      | "comercio"
                      | "indumentaria"
                  );
                }
              }}
              className="w-40 text-black"
              classNamePrefix="react-select"
              isSearchable={false}
            />
          </div>

          <div className="flex flex-col justify-center items-center">
            <UserMenu
              theme={theme}
              handleTheme={handleTheme}
              handleCloseSession={handleCloseSession}
            />
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
