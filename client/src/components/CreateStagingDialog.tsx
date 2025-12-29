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
import { Key, Database, MessageSquare, Loader2, CheckCircle, ArrowRight, Server, Play } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

interface CreateStagingDialogProps {
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

export default function CreateStagingDialog({
  open,
  onOpenChange,
}: CreateStagingDialogProps) {
  const [activeStep, setActiveStep] = useState(1);
  const [createdCredentials, setCreatedCredentials] = useState<Record<string, string>>({}); // type -> id
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [provisionResults, setProvisionResults] = useState<any[]>([]);

  const provisionMutation = trpc.n8n.createStagingEnvironment.useMutation();

  const handleCredentialCreated = (type: string, id: string) => {
    setCreatedCredentials(prev => ({ ...prev, [type]: id }));
    toast.success(`${type} credential ready for staging.`);
  };

  const handleProvision = async () => {
    if (Object.keys(createdCredentials).length === 0) {
        toast.error("Please create at least one credential first.");
        return;
    }

    setIsProvisioning(true);
    setActiveStep(3); // Move to processing step
    try {
        const result = await provisionMutation.mutateAsync({
            credentials: createdCredentials
        });
        setProvisionResults(result.results);
        toast.success("Staging environment provisioned successfully!");
    } catch (error: any) {
        toast.error(`Provisioning failed: ${error.message}`);
    } finally {
        setIsProvisioning(false);
    }
  };

  const reset = () => {
      setActiveStep(1);
      setCreatedCredentials({});
      setProvisionResults([]);
      setIsProvisioning(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
    }}>
      <DialogContent className="max-w-3xl bg-slate-900 border-slate-700 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Server className="w-5 h-5 text-accent" />
            Create Staging Environment
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Setup a fresh staging environment from production workflows.
          </DialogDescription>
        </DialogHeader>

        {/* Wizard Steps */}
        <div className="flex items-center justify-between px-8 py-4 border-b border-slate-800">
            <div className={`flex flex-col items-center ${activeStep >= 1 ? 'text-accent' : 'text-slate-500'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 mb-1 ${activeStep >= 1 ? 'border-accent bg-accent/20' : 'border-slate-600'}`}>1</div>
                <span className="text-xs">Credentials</span>
            </div>
            <div className={`flex-1 h-0.5 mx-4 ${activeStep >= 2 ? 'bg-accent' : 'bg-slate-700'}`} />
            <div className={`flex flex-col items-center ${activeStep >= 2 ? 'text-accent' : 'text-slate-500'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 mb-1 ${activeStep >= 2 ? 'border-accent bg-accent/20' : 'border-slate-600'}`}>2</div>
                <span className="text-xs">Review</span>
            </div>
            <div className={`flex-1 h-0.5 mx-4 ${activeStep >= 3 ? 'bg-accent' : 'bg-slate-700'}`} />
            <div className={`flex flex-col items-center ${activeStep >= 3 ? 'text-accent' : 'text-slate-500'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 mb-1 ${activeStep >= 3 ? 'border-accent bg-accent/20' : 'border-slate-600'}`}>3</div>
                <span className="text-xs">Provision</span>
            </div>
        </div>

        <div className="mt-4">
            {activeStep === 1 && (
                <StepCredentials 
                    createdCredentials={createdCredentials} 
                    onCredentialCreated={handleCredentialCreated}
                    onNext={() => setActiveStep(2)}
                />
            )}

            {activeStep === 2 && (
                <div className="space-y-6 py-4">
                    <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                        <h3 className="text-lg font-medium mb-2 flex items-center gap-2">
                            <Key className="w-4 h-4 text-accent" />
                            Staging Credentials Ready
                        </h3>
                        <div className="space-y-2">
                            {Object.entries(createdCredentials).map(([type, id]) => (
                                <div key={type} className="flex items-center justify-between p-2 bg-slate-900 rounded border border-slate-800">
                                    <span className="capitalize text-slate-300">{type}</span>
                                    <Badge variant="outline" className="text-green-400 border-green-500/30 bg-green-500/10">
                                        <CheckCircle className="w-3 h-3 mr-1" />
                                        Created
                                    </Badge>
                                </div>
                            ))}
                            {Object.keys(createdCredentials).length === 0 && (
                                <p className="text-sm text-slate-500 italic">No new credentials created. Production credentials will be kept (or process might fail if specific ones are required).</p>
                            )}
                        </div>
                    </div>

                    <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                        <h3 className="text-lg font-medium mb-2 flex items-center gap-2">
                            <Play className="w-4 h-4 text-accent" />
                            Process Overview
                        </h3>
                        <ul className="list-disc list-inside text-sm text-slate-400 space-y-1">
                            <li>Fetch all "dev" workflows from Production.</li>
                            <li>Rename them to "staging - [Name]".</li>
                            <li>Replace credentials with the new Staging ones configured above.</li>
                            <li>Create/Overwrite workflows in N8N.</li>
                        </ul>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setActiveStep(1)}>Back</Button>
                        <Button onClick={handleProvision} className="bg-accent hover:bg-accent-dark text-accent-foreground">
                            Start Provisioning
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </DialogFooter>
                </div>
            )}

            {activeStep === 3 && (
                <div className="space-y-6 py-4">
                    {isProvisioning ? (
                        <div className="flex flex-col items-center justify-center py-12 space-y-4">
                            <Loader2 className="w-12 h-12 text-accent animate-spin" />
                            <div className="text-center">
                                <h3 className="text-lg font-medium">Provisioning Staging Environment...</h3>
                                <p className="text-slate-400 text-sm">Fetching workflows, replacing credentials, and deploying.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-green-400 mb-4">
                                <CheckCircle className="w-6 h-6" />
                                <h3 className="text-xl font-medium">Provisioning Complete</h3>
                            </div>
                            
                            <div className="border border-slate-700 rounded-lg overflow-hidden">
                                <div className="bg-slate-800 px-4 py-2 border-b border-slate-700 font-medium text-sm">
                                    Results ({provisionResults.length} workflows)
                                </div>
                                <div className="max-h-[300px] overflow-y-auto p-2 space-y-1 bg-slate-900">
                                    {provisionResults.map((res: any, idx: number) => (
                                        <div key={idx} className="flex items-center justify-between text-sm p-2 hover:bg-slate-800/50 rounded">
                                            <span className="text-slate-300">{res.originalName} → {res.stagingName}</span>
                                            {res.status === 'success' ? (
                                                <Badge className="bg-green-500/20 text-green-400 border-green-500/50">Success</Badge>
                                            ) : (
                                                <Badge className="bg-red-500/20 text-red-400 border-red-500/50">Failed</Badge>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <DialogFooter>
                                <Button onClick={() => onOpenChange(false)} className="bg-accent hover:bg-accent-dark text-accent-foreground">
                                    Done
                                </Button>
                            </DialogFooter>
                        </div>
                    )}
                </div>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StepCredentials({ createdCredentials, onCredentialCreated, onNext }: { 
    createdCredentials: Record<string, string>, 
    onCredentialCreated: (type: string, id: string) => void,
    onNext: () => void
}) {
    const [activeTab, setActiveTab] = useState('supabase');

    return (
        <div className="space-y-4">
            <p className="text-sm text-slate-400">
                Configure new credentials for the staging environment. You can create multiple.
                Once created, they will be used to replace production credentials in the next step.
            </p>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
                <TabsList className="grid w-full grid-cols-3 bg-slate-800 border border-slate-700">
                    <TabsTrigger value="supabase" className="relative data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
                        Supabase
                        {createdCredentials['supabase'] && <div className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full" />}
                    </TabsTrigger>
                    <TabsTrigger value="respondio" className="relative data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
                        Respond.io
                        {createdCredentials['respondio'] && <div className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full" />}
                    </TabsTrigger>
                    <TabsTrigger value="postgres" className="relative data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
                        Postgres
                        {createdCredentials['postgres'] && <div className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full" />}
                    </TabsTrigger>
                </TabsList>

                <div className="mt-4 p-4 border border-slate-700 rounded-lg bg-slate-800/30">
                    <TabsContent value="supabase" className="mt-0">
                        <SupabaseForm onSuccess={(id) => onCredentialCreated('supabase', id)} />
                    </TabsContent>

                    <TabsContent value="respondio" className="mt-0">
                        <RespondIoForm onSuccess={(id) => onCredentialCreated('respondio', id)} />
                    </TabsContent>

                    <TabsContent value="postgres" className="mt-0">
                        <PostgresForm onSuccess={(id) => onCredentialCreated('postgres', id)} />
                    </TabsContent>
                </div>
            </Tabs>

            <div className="flex justify-end pt-4">
                <Button onClick={onNext} className="bg-slate-700 hover:bg-slate-600 text-white">
                    Next: Review & Provision
                    <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
            </div>
        </div>
    );
}

function SupabaseForm({ onSuccess }: { onSuccess: (id: string) => void }) {
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
      const result: any = await mutation.mutateAsync({
        type: 'supabase',
        data: {
            host: data.host,
            serviceRoleSecret: data.serviceRoleSecret,
            allowedDomains: data.allowedDomainType === 'all' ? '*' : data.allowedDomainType === 'none' ? '' : data.specificAllowedDomain
        },
      });
      // Assuming result has ID, otherwise we can't track it effectively for replacement if we need strict ID mapping
      // But for now we just mark it as done. If result has ID, pass it.
      onSuccess(result?.id || 'created'); 
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

        <Button type="submit" disabled={mutation.isPending} className="w-full bg-accent hover:bg-accent-dark text-accent-foreground">
            {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Create Supabase Credential
        </Button>
      </form>
    </Form>
  );
}

function RespondIoForm({ onSuccess }: { onSuccess: (id: string) => void }) {
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
      const result: any = await mutation.mutateAsync({
        type: 'respondio',
        data: {
             apiKey: data.apiKey,
             allowedDomains: data.allowedDomainType === 'all' ? '*' : data.allowedDomainType === 'none' ? '' : data.specificAllowedDomain
        },
      });
      onSuccess(result?.id || 'created');
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

        <Button type="submit" disabled={mutation.isPending} className="w-full bg-accent hover:bg-accent-dark text-accent-foreground">
            {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Create Respond.io Credential
        </Button>
      </form>
    </Form>
  );
}

function PostgresForm({ onSuccess }: { onSuccess: (id: string) => void }) {
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
      const result: any = await mutation.mutateAsync({
        type: 'postgres',
        data: data,
      });
      onSuccess(result?.id || 'created');
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

        <Button type="submit" disabled={mutation.isPending} className="w-full bg-accent hover:bg-accent-dark text-accent-foreground">
            {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Create Postgres Credential
        </Button>
      </form>
    </Form>
  );
}