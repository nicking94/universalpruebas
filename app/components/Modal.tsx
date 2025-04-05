"use client";
import Button from "./Button";
import { ModalProps } from "../lib/types/types";
import { useEffect } from "react";

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  onConfirm = () => {},
  title = "Confirmación",
  children,
  disabled = false,
  btnlText = "Guardar",
  btnrText = "Cancelar",
  btnHidden = false,
  bgColor = "bg-white dark:bg-gray_b ",
}) => {
  useEffect(() => {
    if (isOpen) {
      window.scrollTo({ top: 0 });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed top-0 left-0 w-full h-full bg-gray_m/40 dark:bg-gray_l/40 flex justify-center items-center">
        <div
          className={`${bgColor}  min-h-[13rem] w-[36rem] rounded-sm shadow-lg shadow-gray_b p-6 text-gray_b dark:text-white flex flex-col justify-between space-y-10 `}
        >
          <h2 className="text-xl font-bold">{title}</h2>
          <div className="overflow-y-auto max-h-[50vh] pr-2">{children}</div>
          <div className="flex justify-end space-x-2">
            <Button
              text={btnlText}
              colorText="text-white"
              colorTextHover="text-white"
              onClick={() => {
                onConfirm();
                onClose();
              }}
              disabled={disabled}
              isHidden={btnHidden}
            />
            <Button
              text={btnrText}
              colorText="text-gray_b dark:text-white"
              colorTextHover="hover:text-white hover:dark:text-white"
              colorBg="bg-gray_xl dark:bg-gray_m"
              colorBgHover="hover:bg-blue_m hover:dark:bg-gray_l"
              onClick={onClose}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default Modal;
