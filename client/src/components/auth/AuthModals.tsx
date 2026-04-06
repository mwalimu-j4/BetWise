import LoginModal from "./LoginModal";
import RegisterModal from "./RegisterModal";

/**
 * Renders all auth modals globally.
 * Should be placed in the root layout to ensure modals are available on all pages.
 */
export default function AuthModals() {
  return (
    <>
      <LoginModal />
      <RegisterModal />
    </>
  );
}
