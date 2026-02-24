import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Bot, Calendar, Server, Zap, FolderOpen, Cpu, Radio, KeyRound, Send } from "lucide-react";
import Link from "next/link";
import { useCounts } from "@/lib/counts-context";

export default function Dashboard() {
  const { counts } = useCounts();

  // Same order as sidebar (Dashboard excluded — you're already here)
  const stats = [
    { label: "Agents",         value: counts?.agents,        icon: Bot,        href: "/agents"        },
    { label: "Channels",       value: counts?.channels,      icon: Radio,      href: "/channels"      },
    { label: "Credentials",    value: counts?.credentials,   icon: KeyRound,   href: "/credentials"   },
    { label: "Delivery",       value: counts?.deliveryQueue, icon: Send,       href: "/delivery"      },
    { label: "Memory",         value: counts?.memory,        icon: Brain,      href: "/memory"        },
    { label: "Models",         value: counts?.models,        icon: Cpu,        href: "/models"        },
    { label: "Nodes",          value: counts?.nodes,         icon: Server,     href: "/nodes"         },
    { label: "Scheduled",      value: counts?.scheduled,     icon: Calendar,   href: "/scheduled"     },
    { label: "Skills",         value: counts?.skills,        icon: Zap,        href: "/skills"        },
    { label: "Workspaces",     value: counts?.workspaces,    icon: FolderOpen, href: "/workspaces"    },
  ];

  return (
    <Layout>
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-4 sm:p-8 space-y-6 sm:space-y-8">
        <div>
          <h1 className="text-2xl sm:text-4xl font-bold">Dashboard</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">Welcome to Helm</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Link key={stat.label} href={stat.href} className="block">
                <Card className="cursor-pointer hover:shadow-md active:scale-[0.98] transition-all h-full">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-xs sm:text-sm font-medium">{stat.label}</CardTitle>
                    <Icon className="h-3 sm:h-4 w-3 sm:w-4 text-muted-foreground flex-shrink-0" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl sm:text-2xl font-bold">
                      {counts === null ? "—" : (stat.value ?? 0)}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
