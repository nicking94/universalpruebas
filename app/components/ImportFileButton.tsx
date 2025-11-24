import { useRef } from "react";
import { Button, Box } from "@mui/material";
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
    <Box>
      <Button
        variant="contained"
        startIcon={<FolderUp className="w-5 h-5" />}
        onClick={handleButtonClick}
        sx={{
          textTransform: "none",
          fontWeight: 600,
          backgroundColor: "primary.main",
          color: "white",
          "&:hover": {
            backgroundColor: "primary.dark",
            color: "white",
          },
        }}
      >
        Importar archivo
      </Button>
      <input
        type="file"
        accept=".json,.txt"
        ref={fileInputRef}
        onChange={onImport}
        style={{ display: "none" }}
      />
    </Box>
  );
}
