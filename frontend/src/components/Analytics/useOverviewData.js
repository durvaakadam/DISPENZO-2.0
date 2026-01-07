import { useEffect, useState } from "react";
import { collectionGroup, getDocs } from "firebase/firestore";
import { db } from "../../firebase";

export const useOverviewData = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const snap = await getDocs(collectionGroup(db, "logs"));

        const data = snap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));

        setLogs(data);
      } catch (err) {
        console.error("Error fetching overview data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  return { logs, loading };
};