const en = {
  connecting: 'Connecting to server…',
  title: 'Connect your phone camera',
  steps: ['Open the Camera app on your phone.', 'Scan this QR code.', 'Allow camera access.'],
  expiresIn: 'Code expires in',
  expired: 'This QR code has expired.',
  regenerate: 'New QR code',
  copyLink: 'Copy link',
  copied: 'Link copied',
  phoneLeft: 'Phone disconnected. Scan again to reconnect.',
  paired: 'Phone connected. Frame the subject on your phone.',
  waitingVideo: 'Waiting for video…',
  capture: 'Take photo',
  capturing: 'Capturing…',
  error: "Can't reach the AirDevice server.",
  retry: 'Retry',
};

export type Messages = typeof en;

const vi: Messages = {
  connecting: 'Đang kết nối tới máy chủ…',
  title: 'Kết nối camera điện thoại',
  steps: ['Mở ứng dụng Camera trên điện thoại.', 'Quét mã QR này.', 'Cho phép truy cập camera.'],
  expiresIn: 'Mã hết hạn sau',
  expired: 'Mã QR đã hết hạn.',
  regenerate: 'Tạo mã mới',
  copyLink: 'Sao chép liên kết',
  copied: 'Đã sao chép',
  phoneLeft: 'Điện thoại đã ngắt kết nối. Quét lại để kết nối.',
  paired: 'Đã kết nối. Căn chỉnh khung hình trên điện thoại.',
  waitingVideo: 'Đang chờ hình ảnh…',
  capture: 'Chụp ảnh',
  capturing: 'Đang chụp…',
  error: 'Không kết nối được máy chủ AirDevice.',
  retry: 'Thử lại',
};

export function getMessages(lang: string): Messages {
  return lang.toLowerCase().startsWith('vi') ? vi : en;
}
