import axios from "axios";
import { useState } from "react";

const API_BASE_URL = "http://https://ecom-common-backend.onrender.com:5000";

function InvoiceButton({ orderId, token }) {
  const [loading, setLoading] = useState(false);

  const downloadInvoice = async () => {
    try {
      setLoading(true);

      const response = await axios.get(
        `${API_BASE_URL}/customer/order-invoice/${orderId}`, // ✅ IMPORTANT
        {
          responseType: "blob",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Create file
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");

      link.href = url;
      link.setAttribute("download", `invoice-${orderId}.pdf`);

      document.body.appendChild(link);
      link.click();
      link.remove();

    } catch (error) {
      console.error("Download failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={downloadInvoice}
      className="mt-4 inline-flex w-fit items-center justify-center rounded-[16px] bg-[#081b45] px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-white shadow-[0_8px_20px_rgba(8,27,69,0.25)] transition-all duration-300 hover:bg-[#0a2463] hover:shadow-[0_12px_25px_rgba(8,27,69,0.35)] active:scale-[0.96]"
    >
      {loading ? "DOWNLOADING..." : "DOWNLOAD INVOICE"}
    </button>
  );
}

export default InvoiceButton;