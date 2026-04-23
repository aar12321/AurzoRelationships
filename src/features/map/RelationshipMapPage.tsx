// Relationship Map — a single bird's-eye view of the user's network.
// Concentric rings by relationship_type (partner closest, acquaintance
// furthest), node radius by strength, line opacity by strength. Click a
// node to open that person's profile.
//
// Pure SVG + no external deps. A minimal filter lets the user hide types
// they don't want to see (e.g. collapse acquaintances).

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePeopleStore } from '@/stores/peopleStore';
import { useInteractionsStore } from '@/stores/interactionsStore';
import { computeStrength } from '@/services/interactionsService';
import {
  layoutMap, legendTypes, strengthOpacity, TYPE_COLORS,
} from '@/services/relationshipMapService';
import type { RelationshipType, Strength } from '@/types/people';

const VIEW = 900; // viewBox is -450..450 on both axes

export default function RelationshipMapPage() {
  const navigate = useNavigate();
  const people = usePeopleStore((s) => s.people);
  const loadPeople = usePeopleStore((s) => s.loadAll);
  const interactions = useInteractionsStore((s) => s.interactions);
  const loadIx = useInteractionsStore((s) => s.load);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [hidden, setHidden] = useState<Set<RelationshipType | 'other'>>(new Set());

  useEffect(() => {
    if (people.length === 0) void loadPeople();
    if (interactions.length === 0) void loadIx();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const visiblePeople = useMemo(
    () => people.filter((p) => !hidden.has((p.relationship_type ?? 'other'))),
    [people, hidden],
  );

  const { nodes, rings } = useMemo(
    () => layoutMap(
      visiblePeople.map((p) => ({
        id: p.id, full_name: p.full_name, relationship_type: p.relationship_type,
      })),
      (id) => {
        const p = visiblePeople.find((x) => x.id === id);
        return p ? computeStrength(p, interactions) : ('unknown' as Strength);
      },
    ),
    [visiblePeople, interactions],
  );

  const types = useMemo(() => legendTypes(people), [people]);
  const hovered = useMemo(
    () => (hoverId ? nodes.find((n) => n.id === hoverId) : null),
    [hoverId, nodes],
  );

  function toggle(t: RelationshipType | 'other') {
    setHidden((prev) => {
      const n = new Set(prev);
      n.has(t) ? n.delete(t) : n.add(t);
      return n;
    });
  }

  return (
    <section className="animate-bloom">
      <header className="mb-5">
        <h1 className="text-4xl">Your network.</h1>
        <p className="text-charcoal-500 dark:text-charcoal-300 mt-1">
          Closer rings = closer ties. Larger dots = warmer relationships.
        </p>
      </header>

      {people.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid md:grid-cols-[1fr_220px] gap-5">
          <div className="card-journal p-0 overflow-hidden">
            <svg viewBox={`${-VIEW / 2} ${-VIEW / 2} ${VIEW} ${VIEW}`}
                 className="w-full h-[70vh] min-h-[420px] block">
              {/* Rings */}
              {rings.map((ring) => (
                <g key={ring.type}>
                  <circle cx={0} cy={0} r={ring.radius}
                    fill="none"
                    className="stroke-cream-200 dark:stroke-charcoal-700"
                    strokeDasharray="2 4" />
                  <text x={ring.radius + 6} y={-4}
                    className="fill-charcoal-500 dark:fill-charcoal-300"
                    style={{ fontSize: 10 }}>
                    {ring.label}
                  </text>
                </g>
              ))}

              {/* Connectors */}
              {nodes.map((n) => (
                <line key={`line:${n.id}`} x1={0} y1={0} x2={n.x} y2={n.y}
                  stroke={TYPE_COLORS[(n.type ?? 'other') as keyof typeof TYPE_COLORS]}
                  strokeOpacity={strengthOpacity(n.strength) * 0.35}
                  strokeWidth={hoverId === n.id ? 2 : 1} />
              ))}

              {/* You (center) */}
              <circle cx={0} cy={0} r={18} fill="#c9a15b" />
              <circle cx={0} cy={0} r={18} fill="none"
                stroke="#9a7838" strokeWidth={2} />
              <text x={0} y={4} textAnchor="middle"
                className="fill-ivory-50"
                style={{ fontSize: 11, fontWeight: 600 }}>You</text>

              {/* People */}
              {nodes.map((n) => (
                <g key={n.id} onMouseEnter={() => setHoverId(n.id)}
                   onMouseLeave={() => setHoverId(null)}
                   onClick={() => navigate(`/relationships/people/${n.id}`)}
                   style={{ cursor: 'pointer' }}>
                  <circle cx={n.x} cy={n.y} r={n.r + 4}
                    fill={TYPE_COLORS[(n.type ?? 'other') as keyof typeof TYPE_COLORS]}
                    fillOpacity={hoverId === n.id ? 0.22 : 0} />
                  <circle cx={n.x} cy={n.y} r={n.r}
                    fill={TYPE_COLORS[(n.type ?? 'other') as keyof typeof TYPE_COLORS]}
                    fillOpacity={strengthOpacity(n.strength)} />
                  {hoverId === n.id && (
                    <text x={n.x} y={n.y - n.r - 6} textAnchor="middle"
                      className="fill-charcoal-900 dark:fill-cream-50"
                      style={{ fontSize: 12, fontWeight: 500 }}>
                      {n.name}
                    </text>
                  )}
                </g>
              ))}
            </svg>
          </div>

          <aside className="space-y-3">
            <div className="card-journal">
              <h3 className="text-xs uppercase tracking-wider text-charcoal-500 mb-3">
                Filters
              </h3>
              <ul className="space-y-1.5">
                {types.map((t) => (
                  <li key={t}>
                    <button onClick={() => toggle(t)}
                      className="flex items-center gap-2 w-full text-left text-sm
                                 hover:opacity-80 transition-opacity">
                      <span className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: TYPE_COLORS[t],
                                 opacity: hidden.has(t) ? 0.25 : 1 }} />
                      <span className={hidden.has(t)
                        ? 'line-through text-charcoal-500' : ''}>
                        {labelFor(t)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="card-journal">
              <h3 className="text-xs uppercase tracking-wider text-charcoal-500 mb-3">
                Selected
              </h3>
              {hovered ? (
                <div className="text-sm">
                  <div className="font-serif text-lg text-charcoal-900 dark:text-cream-50">
                    {hovered.name}
                  </div>
                  <div className="text-xs text-charcoal-500 dark:text-charcoal-300 mt-1">
                    {labelFor((hovered.type ?? 'other') as RelationshipType | 'other')}
                    {' · '}
                    {hovered.strength}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-charcoal-500 dark:text-charcoal-300">
                  Hover a dot to see who it is. Click to open their profile.
                </p>
              )}
            </div>

            <div className="card-journal">
              <h3 className="text-xs uppercase tracking-wider text-charcoal-500 mb-2">
                Reading the map
              </h3>
              <p className="text-xs text-charcoal-500 dark:text-charcoal-300 leading-relaxed">
                Larger, brighter dots are relationships you're actively
                keeping warm. Smaller, faded dots may be worth reaching out to.
              </p>
            </div>
          </aside>
        </div>
      )}
    </section>
  );
}

function labelFor(t: RelationshipType | 'other'): string {
  if (t === 'other') return 'Other';
  return t.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function EmptyState() {
  return (
    <div className="card-journal text-center py-10">
      <div className="text-4xl mb-3">🗺️</div>
      <h3 className="font-serif text-2xl mb-2">Your map starts with one person.</h3>
      <p className="text-charcoal-500 dark:text-charcoal-300">
        Add someone you care about and you'll start to see the shape of your world.
      </p>
    </div>
  );
}
