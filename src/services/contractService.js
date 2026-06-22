import axiosClient from "../config/axiosClient";

const contractService = {
  /**
   * Tạo hợp đồng mới
   */
  createContract: async (data) => {
    
    const response = await axiosClient.post("/contracts", data);
    return response.data;
  },

  /**
   * Xuất file PDF hợp đồng
   */
  exportContractPdf: async (id) => {
    // Viết trực tiếp "/contracts" vào đây
    const response = await axiosClient.get(`/contracts/${id}/pdf`, {
      responseType: "blob",
    });

    // ... (Phần xử lý download file giữ nguyên) ...
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `contract_${id}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    
    return true;
  },

 
};

export default contractService;