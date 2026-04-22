type Props = {
  title: string;
  tagline: string;
  invitation: string;
};

export default function ModulePlaceholder({ title, tagline, invitation }: Props) {
  return (
    <section className="animate-bloom">
      <header className="mb-6">
        <h1 className="text-4xl">{title}</h1>
        <p className="text-charcoal-500 mt-1">{tagline}</p>
      </header>

      <div className="card-journal text-center py-12">
        <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-cream-200" />
        <p className="text-charcoal-700 max-w-md mx-auto">{invitation}</p>
        <p className="text-xs text-charcoal-500 mt-6">
          This module is scaffolded. It will come to life in a later build session.
        </p>
      </div>
    </section>
  );
}
