import { useRef } from "react";
import Button from "@/app/components/Button";
import { FolderUp } from "lucide-react";

export default function ImportFileButton({
  onImport,
}: {
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <Button
        icon={<FolderUp className="w-5 h-5" />}
        text="Importar archivo"
        onClick={handleButtonClick}
        colorText="text-white"
        colorTextHover="text-white"
        colorBg="bg-blue_b"
        colorBgHover="hover:bg-blue_m"
      />
      <input
        type="file"
        accept=".json,.txt"
        ref={fileInputRef}
        onChange={onImport}
        className="hidden"
      />
    </>
  );
}
