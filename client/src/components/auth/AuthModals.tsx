import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import LoginModal from "./LoginModal";
import RegisterModal from "./RegisterModal";
import ForgotPasswordModal from "./ForgotPasswordModal";

/**
 * Renders all auth modals globally using a portal.
 * Uses React Portal to escape layout constraints and render at document body level.
 * This ensures modals and overlays render above all other content.
 */
export default function AuthModals() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <>
      <LoginModal />
      <RegisterModal />
      <ForgotPasswordModal />
    </>,
    document.body,
  );
}
