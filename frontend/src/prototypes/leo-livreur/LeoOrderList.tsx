import { HouseIcon } from "./LeoMissionIcons";
import styles from "./LeoMissionContent.module.css";

export interface LeoOrderLine {
  address: string;
  pizzas: number;
}

/** Commandes de la tournée : une ligne compacte par maison (adresse réelle et quantité du moteur pédagogique). */
export function LeoOrderList({ orders }: { orders: readonly LeoOrderLine[] }) {
  return (
    <ul className={styles.orders} aria-label="Commandes">
      {orders.map(({ address, pizzas }) => (
        <li key={address}>
          <HouseIcon />
          <span className={styles.orderAddress}>{address}</span>
          <strong>{pizzas} pizza{pizzas > 1 ? "s" : ""}</strong>
        </li>
      ))}
    </ul>
  );
}
