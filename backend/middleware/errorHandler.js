export const notFound = (req, res) => {
  res.status(404).json({ message: '找不到此 API 路徑。' });
};

export const errorHandler = (error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  if (error.name === 'ValidationError') {
    const details = Object.values(error.errors).map((item) => item.message);
    return res.status(400).json({ message: '資料格式不正確。', details });
  }

  if (error.code === 11000) {
    return res.status(409).json({ message: '此名稱已被使用，請換一個名稱。' });
  }

  console.error(error);
  return res.status(500).json({ message: '伺服器發生錯誤，請稍後再試。' });
};
