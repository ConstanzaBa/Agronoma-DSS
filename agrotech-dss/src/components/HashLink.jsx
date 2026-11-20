import { Link, useLocation } from "react-router-dom";

/**
 * Link a una sección de la landing ("/#sectores").
 * Si ya estamos en la landing, hace scroll directo (el cambio de hash por sí solo no re-dispara el scroll
 * cuando el hash no cambia); si venimos de otra página, navega y Home se encarga del scroll.
 */
export default function HashLink({ to, onClick, children, ...rest }) {
  const { pathname } = useLocation();

  const handle = (e) => {
    onClick?.(e);
    const [path, hash] = to.split("#");
    if (hash && pathname === (path || "/")) {
      const el = document.getElementById(hash);
      if (el) {
        e.preventDefault();
        el.scrollIntoView({ behavior: "smooth" });
        window.history.replaceState(null, "", to);
      }
    }
  };

  return (
    <Link to={to} onClick={handle} {...rest}>
      {children}
    </Link>
  );
}
