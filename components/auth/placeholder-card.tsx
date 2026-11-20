import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type PlaceholderCardProps = {
  eyebrow: string;
  title: string;
  description: string;
  items: string[];
};

export function PlaceholderCard({
  eyebrow,
  title,
  description,
  items,
}: PlaceholderCardProps) {
  return (
    <Card className="border-danwell-navy/10 shadow-sm">
      <CardHeader>
        <p className="text-xs font-medium tracking-[0.18em] text-danwell-teal uppercase">
          {eyebrow}
        </p>
        <CardTitle className="text-xl text-danwell-navy">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
          {items.map((item) => (
            <li
              key={item}
              className="rounded-lg border bg-muted/40 px-3 py-2"
            >
              {item}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
