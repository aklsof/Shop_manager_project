export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <div className="navbar-fixed-bottom row-fluid">
      <div className="navbar-inner">
        <div className="container text-center">
          Copyright &copy; {year}
        </div>
      </div>
    </div>
  );
}
