import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { Budget } from "../lib/types/types";

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 12,
  },
  header: {
    marginBottom: 20,
    textAlign: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 5,
  },
  section: {
    marginBottom: 15,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
    padding: 5,
    fontWeight: "bold",
  },
  tableRow: {
    flexDirection: "row",
    padding: 5,
    borderBottom: "1px solid #e0e0e0",
  },
  col1: { width: "40%" },
  col2: { width: "15%", textAlign: "right" },
  col3: { width: "15%", textAlign: "right" },
  col4: { width: "15%", textAlign: "right" },
  col5: { width: "15%", textAlign: "right" },
  total: {
    marginTop: 10,
    textAlign: "right",
    fontWeight: "bold",
  },
  notes: {
    marginTop: 20,
    paddingTop: 10,
    borderTop: "1px solid #e0e0e0",
  },
});

// Props del componente
interface BudgetPDFProps {
  budget: Budget;
}

const BudgetPDF: React.FC<BudgetPDFProps> = ({ budget }) => {
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("es-AR");
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>PRESUPUESTO</Text>
          <Text style={styles.subtitle}>N°: {budget.id}</Text>
          <Text>Fecha: {formatDate(budget.createdAt)}</Text>
          {budget.expirationDate && (
            <Text>Válido hasta: {formatDate(budget.expirationDate)}</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text>Cliente: {budget.customerName}</Text>
          {budget.customerPhone && (
            <Text>Teléfono: {budget.customerPhone}</Text>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.tableHeader}>
            <Text style={styles.col1}>Producto</Text>
            <Text style={styles.col2}>Cantidad</Text>
            <Text style={styles.col3}>P. Unit.</Text>
            <Text style={styles.col4}>Desc. %</Text>
            <Text style={styles.col5}>Subtotal</Text>
          </View>

          {budget.items.map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={styles.col1}>
                {item.productName}
                {item.size && ` (${item.size})`}
                {item.color && ` - ${item.color}`}
              </Text>
              <Text style={styles.col2}>{item.quantity}</Text>
              <Text style={styles.col3}>${item.price.toFixed(2)}</Text>
              <Text style={styles.col4}>{item.discount ?? 0}%</Text>
              <Text style={styles.col5}>
                $
                {(
                  item.price *
                  item.quantity *
                  (1 - (item.discount ?? 0) / 100)
                ).toFixed(2)}
              </Text>
            </View>
          ))}

          <View style={styles.total}>
            <Text>TOTAL: ${budget.total.toFixed(2)}</Text>
          </View>
        </View>

        {budget.notes && (
          <View style={styles.notes}>
            <Text>Notas:</Text>
            <Text>{budget.notes}</Text>
          </View>
        )}

        <View style={{ marginTop: 30, textAlign: "center" }}>
          <Text>Estado: {budget.status?.toUpperCase()}</Text>
        </View>
      </Page>
    </Document>
  );
};

export default BudgetPDF;
