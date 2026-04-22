import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import LoginModal from "./LoginModal";
import RegisterModal from "./RegisterModal";
import ForgotPasswordModal from "./ForgotPasswordModal";
import { useAuth } from "@/context/AuthContext";

/**
 * Renders all auth modals globally using a portal.
 * Uses React Portal to escape layout constraints and render at document body level.
 * This ensures modals and overlays render above all other content.
 */
export default function AuthModals() {
  const [mounted, setMounted] = useState(false);
  const { authModal } = useAuth();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // The modals themselves handle their own "visibility" based on authModal state,
  // but we can also be explicit here if we want.
  return createPortal(
    <>
      <LoginModal />
      <RegisterModal />
      <ForgotPasswordModal />
    </>,
    document.body,
  );
}
