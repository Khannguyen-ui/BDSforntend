import axiosClient from "../config/axiosClient";

const billService = {
  createBill: (data) => axiosClient.post("/api/bills", data),
};

export default billService;