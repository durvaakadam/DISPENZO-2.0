import { useEffect, useState } from "react";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase";

export const useInventory = (centerId) => {
  const [inventory, setInventory] = useState(null);
  const [monthlyLogs, setMonthlyLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!centerId) return;

    const fetchInventory = async () => {
      try {
        const centerRef = doc(db, "inventory", centerId);
        const centerSnap = await getDoc(centerRef);

        if (centerSnap.exists()) {
          setInventory(centerSnap.data());
        }

        const logsSnap = await getDocs(
          collection(db, "inventory", centerId, "monthlyLogs")
        );

        const logs = logsSnap.docs.map(doc => ({
          month: doc.id,
          ...doc.data(),
        }));

        setMonthlyLogs(logs);
      } catch (err) {
        console.error("Inventory fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchInventory();
  }, [centerId]);

  return { inventory, monthlyLogs, loading };
};