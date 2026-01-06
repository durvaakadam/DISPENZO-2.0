
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase";

export const useSensorErrors = (centerId) => {
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!centerId) return;

    const fetchErrors = async () => {
      try {
        const snap = await getDocs(
          collection(db, "inventory", centerId, "sensorErrors")
        );

        const data = snap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));

        setErrors(data);
      } catch (err) {
        console.error("Sensor error fetch failed:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchErrors();
  }, [centerId]);

  return { errors, loading };
};


