export const getWhatsappUrl = (number: string | undefined, message: string) => {
  const normalizedNumber = number?.replace(/\D/g, "");

  if (!normalizedNumber) {
    return undefined;
  }

  return `https://wa.me/${normalizedNumber}?text=${encodeURIComponent(message)}`;
};

export const getInstagramUrl = (instagram: string | undefined) => {
  if (!instagram) {
    return undefined;
  }

  return instagram.startsWith("http")
    ? instagram
    : `https://instagram.com/${instagram.replace(/^@/, "")}`;
};
