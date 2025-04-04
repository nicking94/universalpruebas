export type Theme = {
  id: number;
  value: string;
};
export type User = {
  username: string;
  password: string;
};

export type AuthData = {
  username: string;
  password: string;
};

export type ButtonProps = {
  children?: React.ReactNode;
  px?: string;
  py?: string;
  width?: string;
  minwidth?: string;
  height?: string;
  text?: string;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  colorText?: string;
  colorBg?: string;
  colorBgHover?: string;
  colorTextHover?: string;
  disabled?: boolean;
  isHidden?: boolean;
};

export type NavbarProps = {
  theme: string;
  handleTheme: () => void;
  handleCloseSession: () => void;
};
export type SidebarProps = {
  items?: Array<{
    label: string;
    href: string;
    icon?: React.ReactNode;
  }>;
};
export type MenuItemProps = {
  label: string;
  href: string;
  icon?: React.ReactNode;
};
export type SidebarContextProps = {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
};
export type NotificationProps = {
  isOpen: boolean;
  message: string;
  type: "success" | "error" | "info";
};

export type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title?: string;
  message?: string | React.ReactNode;
  children?: React.ReactNode;
  disabled?: boolean;
  btnlText?: string;
  btnrText?: string;
  btnHidden?: boolean;
  bgColor?: string;
};

export type PersonalData = {
  name: string;
  age: string | number;
  phone: string;
  email: string;
};

export type InputProps = {
  label?: string;
  type: string;
  name: string;
  value: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  border?: string;
  readOnly?: boolean;
  className?: string;
};
export type UserMenuProps = {
  theme: string;
  handleTheme: () => void;
  handleCloseSession: () => void;
};

export type ProductTableProps = {
  products: Product[];
  onAdd: (product: Product) => void;
  onDelete: (id: number) => void;
  onEdit: (product: Product) => void;
};

export type Product = {
  id: number;
  name: string;
  stock: number | string;
  costPrice: number;
  price: number;
  expiration: string;
};

export type ProductCardProps = {
  product: {
    id: number;
    name: string;
    description: string;
    price: number;
  };
  onDelete: (id: number) => void;
};
export type SearchBarProps = {
  onSearch: (query: string) => void;
};

export type Sale = {
  id: number;
  products: {
    id: number;
    name: string;
    price: string | number;
    quantity: number;
    stock: number | string;
  }[];
  paymentMethod: "Efectivo" | "Transferencia";
  total: number;
  date: string;
};
export type SaleItem = {
  product: Product;
  quantity: number;
};

export type PaginationProps = {
  text?: string;
  text2?: string;
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
};
export type Option = {
  value: string;
  label: string;
};

export type ProductOption = {
  value: number;
  label: string;
  isDisabled: boolean;
};
