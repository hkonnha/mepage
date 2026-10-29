import { scrollToSection } from '../hooks/useActiveSection';

export type NavItem = { id: string; label: string };

export default function Nav({
  items,
  active,
}: {
  items: NavItem[];
  active: string;
}) {
  return (
    <header className="nav">
      <button className="nav-logo" onClick={() => scrollToSection(items[0].id)}>
        PORT<span>_</span>
      </button>
      <nav>
        {items.map((item, i) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className={active === item.id ? 'active' : ''}
            onClick={(e) => {
              e.preventDefault();
              scrollToSection(item.id);
            }}
          >
            <small>0{i + 1}</small> {item.label}
          </a>
        ))}
      </nav>
    </header>
  );
}
