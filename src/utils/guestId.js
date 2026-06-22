export const getGuestId = () => {
    let guestId = localStorage.getItem('guestId');

    // Nếu chưa có guestId hoặc guestId không phải là số (UUID), tự sinh số nguyên và lưu vào localStorage
    if (!guestId || isNaN(guestId)) {
        guestId = Date.now().toString();
        localStorage.setItem('guestId', guestId);
    }

    return guestId;
};