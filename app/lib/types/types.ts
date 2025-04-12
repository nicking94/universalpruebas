export type Theme = {
  id: number;
  value: string;
};

export type AuthData = {
  username: string;
  password: string;
};

export type ButtonProps = {
  onClick?: () => void;
  children?: React.ReactNode;
  px?: string;
  py?: string;
  width?: string;
  minwidth?: string;
  height?: string;
  text?: string;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";

  type?: "button" | "submit" | "reset";
  colorText?: string;
  colorBg?: string;
  colorBgHover?: string;
  colorTextHover?: string;
  disabled?: boolean;
  hotkey?: string;
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
  onConfirm?: () => void;
  onClose: () => void;
  isOpen: boolean;
  title?: string;
  children?: React.ReactNode;
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
  type?: string;
  name?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  border?: string;
  readOnly?: boolean;
  className?: string;
  accept?: string;
  ref?: React.Ref<HTMLInputElement>;
  autoFocus?: boolean;
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
  stock: number;
  costPrice: number;
  price: number;
  expiration?: string;
  quantity: number;
  unit: "Unid." | "gr" | "Kg" | "ml" | "L";
  barcode?: string;
};

export type UnitOption = {
  value: Product["unit"];
  label: string;
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
  products: Product[];
  paymentMethod: "Efectivo" | "Transferencia" | "Tarjeta";
  total: number;
  date: string;
  barcode?: string;
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
  isDisabled?: boolean;
};

export type PaymentMethod = "EFECTIVO" | "TRANSFERENCIA" | "TARJETA";

export type MovementType = "INGRESO" | "EGRESO";

export type DailyCashMovement = {
  id: number;
  amount: number;
  description: string;
  type: "INGRESO" | "EGRESO";
  date: string;
  paymentMethod?: "EFECTIVO" | "TRANSFERENCIA" | "TARJETA";
  productId?: number;
  productName?: string;
  costPrice?: number;
  sellPrice?: number;
  quantity?: number;
  profit?: number;
  unit?: "Unid." | "gr" | "Kg" | "ml" | "L";
};
export type DailyCash = {
  id: number;
  date: string;
  initialAmount: number;
  movements: DailyCashMovement[];
  closed: boolean;
  closingAmount?: number;
  closingDate?: string;
  closingDifference?: number;
  totalIncome?: number;
  totalExpense?: number;
  totalProfit?: number;
  comments?: string;
  openedBy?: string;
  closedBy?: string;
};
