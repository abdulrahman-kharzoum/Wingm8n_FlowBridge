import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Key, Database, MessageSquare, Loader2, CheckCircle } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface CreateStagingCredentialsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// --- Schema Definitions ---

const supabaseSchema = z.object({
  host: z.string().min(1, 'Host is required'),
  serviceRoleSecret: z.string().min(1, 'Service Role Secret is required'),
  allowedDomainType: z.enum(['all', 'specific', 'none']),
  specificAllowedDomain: z.string().optional(),
}).refine(data => data.allowedDomainType !== 'specific' || !!data.specificAllowedDomain, {
  message: "Domain is required when 'Specific' is selected",
  path: ["specificAllowedDomain"],
});

const respondIoSchema = z.object({
  apiKey: z.string().min(1, 'API Key is required'),
  allowedDomainType: z.enum(['all', 'specific', 'none']),
  specificAllowedDomain: z.string().optional(),
}).refine(data => data.allowedDomainType !== 'specific' || !!data.specificAllowedDomain, {
  message: "Domain is required when 'Specific' is selected",
  path: ["specificAllowedDomain"],
});

const postgresSchema = z.object({
  host: z.string().min(1, 'Host is required'),
  database: z.string().min(1, 'Database is required'),
  user: z.string().min(1, 'User is required'),
  password: z.string().min(1, 'Password is required'),
  maxConnections: z.number().min(1),
  ssl: z.enum(['allow', 'require', 'disable']),
  ignoreSslIssues: z.boolean(),
  port: z.number(),
  sshTunnel: z.boolean(),
  sshHost: z.string().optional(),
  sshPort: z.number().optional(),
  sshUser: z.string().optional(),
  sshPassword: z.string().optional(),
}).refine(data => !data.sshTunnel || (!!data.sshHost && !!data.sshUser && !!data.sshPassword), {
  message: "SSH details are required when SSH Tunnel is enabled",
  path: ["sshHost"],
});

type PostgresFormData = z.infer<typeof postgresSchema>;

// --- Components ---

export default function CreateStagingCredentialsDialog({
  open,
  onOpenChange,
}: CreateStagingCredentialsDialogProps) {
  const [activeTab, setActiveTab] = useState('supabase');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-slate-900 border-slate-700 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Key className="w-5 h-5 text-accent" />
            Create Staging Credentials
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Configure new credentials for your staging environment. These will be created in N8N.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-3 bg-slate-800 border border-slate-700">
            <TabsTrigger value="supabase" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">Supabase</TabsTrigger>
            <TabsTrigger value="respondio" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">Respond.io</TabsTrigger>
            <TabsTrigger value="postgres" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">Postgres</TabsTrigger>
          </TabsList>

          <TabsContent value="supabase" className="mt-4">
            <SupabaseForm onSuccess={() => onOpenChange(false)} />
          </TabsContent>

          <TabsContent value="respondio" className="mt-4">
            <RespondIoForm onSuccess={() => onOpenChange(false)} />
          </TabsContent>

          <TabsContent value="postgres" className="mt-4">
            <PostgresForm onSuccess={() => onOpenChange(false)} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function SupabaseForm({ onSuccess }: { onSuccess: () => void }) {
  const mutation = trpc.n8n.createStagingCredential.useMutation();
  const form = useForm<z.infer<typeof supabaseSchema>>({
    resolver: zodResolver(supabaseSchema),
    defaultValues: {
      host: '',
      serviceRoleSecret: '',
      allowedDomainType: 'all',
      specificAllowedDomain: '',
    },
  });

  const domainType = form.watch('allowedDomainType');

  const onSubmit = async (data: z.infer<typeof supabaseSchema>) => {
    try {
      await mutation.mutateAsync({
        type: 'supabase',
        data: {
            host: data.host,
            serviceRoleSecret: data.serviceRoleSecret,
            allowedDomains: data.allowedDomainType === 'all' ? '*' : data.allowedDomainType === 'none' ? '' : data.specificAllowedDomain
        },
      });
      toast.success('Supabase credential creation requested');
      onSuccess();
    } catch (error: any) {
      toast.error(`Failed to create credential: ${error.message}`);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="host"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Host</FormLabel>
              <FormControl>
                <Input placeholder="https://xyz.supabase.co" {...field} className="bg-slate-800 border-slate-700" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="serviceRoleSecret"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Service Role Secret</FormLabel>
              <FormControl>
                <Input type="password" placeholder="eyJh..." {...field} className="bg-slate-800 border-slate-700" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="allowedDomainType"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Allowed HTTP Request Domains</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex flex-col space-y-1"
                >
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="all" />
                    </FormControl>
                    <FormLabel className="font-normal">All Domains (*)</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="specific" />
                    </FormControl>
                    <FormLabel className="font-normal">Specific Domains</FormLabel>
                  </FormItem>
                   <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="none" />
                    </FormControl>
                    <FormLabel className="font-normal">None</FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {domainType === 'specific' && (
          <FormField
            control={form.control}
            name="specificAllowedDomain"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Allowed Domains (Comma separated)</FormLabel>
                <FormControl>
                  <Input placeholder="example.com, api.test.com" {...field} className="bg-slate-800 border-slate-700" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <DialogFooter className="pt-4">
          <Button type="submit" disabled={mutation.isPending} className="bg-accent hover:bg-accent-dark text-accent-foreground">
            {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Create Supabase Credential
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

function RespondIoForm({ onSuccess }: { onSuccess: () => void }) {
  const mutation = trpc.n8n.createStagingCredential.useMutation();
  const form = useForm<z.infer<typeof respondIoSchema>>({
    resolver: zodResolver(respondIoSchema),
    defaultValues: {
      apiKey: '',
      allowedDomainType: 'all',
      specificAllowedDomain: '',
    },
  });

  const domainType = form.watch('allowedDomainType');

  const onSubmit = async (data: z.infer<typeof respondIoSchema>) => {
    try {
      await mutation.mutateAsync({
        type: 'respondio',
        data: {
             apiKey: data.apiKey,
             allowedDomains: data.allowedDomainType === 'all' ? '*' : data.allowedDomainType === 'none' ? '' : data.specificAllowedDomain
        },
      });
      toast.success('Respond.io credential creation requested');
      onSuccess();
    } catch (error: any) {
      toast.error(`Failed to create credential: ${error.message}`);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="apiKey"
          render={({ field }) => (
            <FormItem>
              <FormLabel>API Key</FormLabel>
              <FormControl>
                <Input type="password" placeholder="Enter API Key" {...field} className="bg-slate-800 border-slate-700" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="allowedDomainType"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Allowed HTTP Request Domains</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex flex-col space-y-1"
                >
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="all" />
                    </FormControl>
                    <FormLabel className="font-normal">All Domains (*)</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="specific" />
                    </FormControl>
                    <FormLabel className="font-normal">Specific Domains</FormLabel>
                  </FormItem>
                   <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="none" />
                    </FormControl>
                    <FormLabel className="font-normal">None</FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {domainType === 'specific' && (
          <FormField
            control={form.control}
            name="specificAllowedDomain"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Allowed Domains (Comma separated)</FormLabel>
                <FormControl>
                  <Input placeholder="example.com, api.test.com" {...field} className="bg-slate-800 border-slate-700" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <DialogFooter className="pt-4">
          <Button type="submit" disabled={mutation.isPending} className="bg-accent hover:bg-accent-dark text-accent-foreground">
            {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Create Respond.io Credential
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

function PostgresForm({ onSuccess }: { onSuccess: () => void }) {
  const mutation = trpc.n8n.createStagingCredential.useMutation();
  
  const form = useForm<PostgresFormData>({
    resolver: zodResolver(postgresSchema),
    defaultValues: {
      host: '',
      database: '',
      user: '',
      password: '',
      maxConnections: 100,
      ssl: 'disable',
      ignoreSslIssues: false,
      port: 5432,
      sshTunnel: false,
      sshHost: 'localhost',
      sshPort: 22,
      sshUser: 'root',
      sshPassword: '',
    },
  });

  const sshTunnel = form.watch('sshTunnel');

  const onSubmit = async (data: PostgresFormData) => {
    try {
      await mutation.mutateAsync({
        type: 'postgres',
        data: data,
      });
      toast.success('Postgres credential creation requested');
      onSuccess();
    } catch (error: any) {
      toast.error(`Failed to create credential: ${error.message}`);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="host"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Host</FormLabel>
                <FormControl>
                    <Input placeholder="db.example.com" {...field} className="bg-slate-800 border-slate-700" />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
             <FormField
            control={form.control}
            name="port"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Port</FormLabel>
                <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={e => field.onChange(e.target.valueAsNumber)}
                      className="bg-slate-800 border-slate-700"
                    />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>

        <FormField
          control={form.control}
          name="database"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Database</FormLabel>
              <FormControl>
                <Input placeholder="postgres" {...field} className="bg-slate-800 border-slate-700" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="user"
            render={({ field }) => (
                <FormItem>
                <FormLabel>User</FormLabel>
                <FormControl>
                    <Input placeholder="admin" {...field} className="bg-slate-800 border-slate-700" />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                    <Input type="password" {...field} className="bg-slate-800 border-slate-700" />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>

        <div className="grid grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="maxConnections"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Max Connections</FormLabel>
                <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={e => field.onChange(e.target.valueAsNumber)}
                      className="bg-slate-800 border-slate-700"
                    />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
             <FormField
                control={form.control}
                name="ssl"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>SSL</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger className="bg-slate-800 border-slate-700">
                            <SelectValue placeholder="Select SSL mode" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-slate-800 border-slate-700 text-white">
                        <SelectItem value="allow">Allow</SelectItem>
                        <SelectItem value="require">Require</SelectItem>
                        <SelectItem value="disable">Disable</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
            />
        </div>

        <FormField
          control={form.control}
          name="ignoreSslIssues"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border border-slate-700 p-3 bg-slate-800/50">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Ignore SSL Issues</FormLabel>
                <FormDescription>
                  Insecure - use with caution
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="sshTunnel"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border border-slate-700 p-3 bg-slate-800/50">
              <div className="space-y-0.5">
                <FormLabel className="text-base">SSH Tunnel</FormLabel>
                <FormDescription>
                  Connect via SSH Tunnel
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {sshTunnel && (
            <div className="space-y-4 border-l-2 border-accent pl-4">
                 <div className="grid grid-cols-2 gap-4">
                    <FormField
                    control={form.control}
                    name="sshHost"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>SSH Host</FormLabel>
                        <FormControl>
                            <Input placeholder="localhost" {...field} className="bg-slate-800 border-slate-700" />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="sshPort"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>SSH Port</FormLabel>
                        <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={e => field.onChange(e.target.valueAsNumber)}
                              className="bg-slate-800 border-slate-700"
                            />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                     <FormField
                    control={form.control}
                    name="sshUser"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>SSH User</FormLabel>
                        <FormControl>
                            <Input placeholder="root" {...field} className="bg-slate-800 border-slate-700" />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="sshPassword"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>SSH Password</FormLabel>
                        <FormControl>
                            <Input type="password" {...field} className="bg-slate-800 border-slate-700" />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                 </div>
                 <div className="text-xs text-slate-500">
                    Authentication: Password only
                 </div>
            </div>
        )}

        <DialogFooter className="pt-4">
          <Button type="submit" disabled={mutation.isPending} className="bg-accent hover:bg-accent-dark text-accent-foreground">
            {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Create Postgres Credential
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}