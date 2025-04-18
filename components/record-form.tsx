"use client"

import { useState } from "react"
import { PlusCircle, Trash2, AlertCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CyberButton } from "@/components/cyber-button"
import type { DomainRecord, RecordType, RedirectConfig } from "@/types/domain"
import { 
  isValidIPv4, 
  isValidIPv6, 
  isValidHostname, 
  isValidUrl,
  validateDnsRecords
} from "@/lib/dns-validation"
import { toast } from "@/components/ui/use-toast"

interface RecordFormProps {
  value: DomainRecord
  onChange: (value: DomainRecord) => void
  proxied?: boolean
  redirect_config?: RedirectConfig
}

export function RecordForm({ value, onChange, proxied, redirect_config }: RecordFormProps) {
  const [recordType, setRecordType] = useState<RecordType>("CNAME")
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [showValidation, setShowValidation] = useState(true)

  // Validate records when they change
  const handleChange = (newRecord: DomainRecord) => {
    if (showValidation) {
      const validation = validateDnsRecords(newRecord, proxied, redirect_config)
      setErrors(validation.errors)
    }
    onChange(newRecord)
  }

  const handleAddRecord = () => {
    const newRecord = { ...value }

    // Initialize the record based on type
    switch (recordType) {
      case "A":
      case "AAAA":
      case "NS":
        newRecord[recordType] = newRecord[recordType] || []
        break
      case "MX":
        newRecord.MX = newRecord.MX || []
        break
      case "SRV":
        newRecord.SRV = newRecord.SRV || []
        break
      case "CAA":
        newRecord.CAA = newRecord.CAA || []
        break
      case "DS":
        newRecord.DS = newRecord.DS || []
        break
      case "TXT":
        newRecord.TXT = newRecord.TXT || ""
        break
      case "CNAME":
        newRecord.CNAME = newRecord.CNAME || ""
        break
      case "URL":
        newRecord.URL = newRecord.URL || ""
        break
    }

    handleChange(newRecord)
  }

  const handleRemoveRecord = (type: RecordType) => {
    const newRecord = { ...value }
    delete newRecord[type]
    
    // Also remove any errors for this record type
    const newErrors = { ...errors }
    delete newErrors[type]
    setErrors(newErrors)
    
    handleChange(newRecord)
  }

  const handleUpdateStringRecord = (type: "CNAME" | "URL", val: string) => {
    const newRecord = { ...value, [type]: val }
    
    // Real-time validation
    if (type === "CNAME" && !isValidHostname(val) && val.trim() !== "") {
      const newErrors = { ...errors }
      newErrors[type] = ["Invalid hostname format. Do not include http:// or https://"]
      setErrors(newErrors)
    } else if (type === "URL" && !isValidUrl(val) && val.trim() !== "") {
      const newErrors = { ...errors }
      newErrors[type] = ["Invalid URL format. Include http:// or https://"]
      setErrors(newErrors)
    } else {
      // Clear errors if valid
      const newErrors = { ...errors }
      delete newErrors[type]
      setErrors(newErrors)
    }
    
    handleChange(newRecord)
  }

  const handleUpdateTxtRecord = (val: string) => {
    handleChange({ ...value, TXT: val })
  }

  const handleUpdateArrayRecord = (type: "A" | "AAAA" | "NS", index: number, val: string) => {
    if (!value[type]) return

    const newArray = [...(value[type] as string[])]
    newArray[index] = val
    const newRecord = { ...value, [type]: newArray }
    
    // Validate specific types
    if (val.trim() !== "") {
      const newErrors = { ...errors }
      newErrors[type] = newErrors[type] || []
      
      if (type === "A" && !isValidIPv4(val)) {
        // Update specific error in array
        const typeErrors = [...(newErrors[type] || [])]
        typeErrors[index] = `Invalid IPv4 address`
        newErrors[type] = typeErrors
      } else if (type === "AAAA" && !isValidIPv6(val)) {
        const typeErrors = [...(newErrors[type] || [])]
        typeErrors[index] = `Invalid IPv6 address`
        newErrors[type] = typeErrors
      } else if (type === "NS" && !isValidHostname(val)) {
        const typeErrors = [...(newErrors[type] || [])]
        typeErrors[index] = `Invalid hostname format`
        newErrors[type] = typeErrors
      } else {
        // Clear specific error in array if valid
        if (newErrors[type]) {
          const typeErrors = [...newErrors[type]]
          typeErrors[index] = undefined as any
          
          // If no errors left, remove the whole entry
          if (!typeErrors.some(e => e !== undefined)) {
            delete newErrors[type]
          } else {
            newErrors[type] = typeErrors
          }
        }
      }
      
      setErrors(newErrors)
    }
    
    handleChange(newRecord)
  }

  const handleAddArrayItem = (type: "A" | "AAAA" | "NS") => {
    if (!value[type]) {
      onChange({ ...value, [type]: [""] })
      return
    }

    const newArray = [...(value[type] as string[]), ""]
    onChange({ ...value, [type]: newArray })
  }

  const handleRemoveArrayItem = (type: "A" | "AAAA" | "NS", index: number) => {
    if (!value[type]) return

    const newArray = [...(value[type] as string[])]
    newArray.splice(index, 1)

    if (newArray.length === 0) {
      const newRecord = { ...value }
      delete newRecord[type]
      onChange(newRecord)
      return
    }

    onChange({ ...value, [type]: newArray })
  }

  const handleUpdateMxRecord = (index: number, field: "target" | "priority", val: string) => {
    if (!value.MX) return

    const newArray = [...(value.MX as any[])]

    // Convert string format to object format if needed
    if (typeof newArray[index] === "string") {
      newArray[index] = { target: newArray[index], priority: 10 }
    }

    newArray[index] = {
      ...newArray[index],
      [field]: field === "priority" ? Number.parseInt(val) : val,
    }

    onChange({ ...value, MX: newArray })
  }

  const handleAddMxItem = () => {
    if (!value.MX) {
      onChange({ ...value, MX: [{ target: "", priority: 10 }] })
      return
    }

    const newArray = [...(value.MX as any[]), { target: "", priority: 10 }]
    onChange({ ...value, MX: newArray })
  }

  const handleRemoveMxItem = (index: number) => {
    if (!value.MX) return

    const newArray = [...(value.MX as any[])]
    newArray.splice(index, 1)

    if (newArray.length === 0) {
      const newRecord = { ...value }
      delete newRecord.MX
      onChange(newRecord)
      return
    }

    onChange({ ...value, MX: newArray })
  }

  const handleUpdateSrvRecord = (index: number, field: "target" | "priority" | "weight" | "port", val: string) => {
    if (!value.SRV) return;

    const newArray = [...value.SRV];

    if (field === "target") {
      newArray[index] = { ...newArray[index], target: val };
    } else {
      newArray[index] = { ...newArray[index], [field]: Number.parseInt(val) };
    }

    handleChange({ ...value, SRV: newArray });
  };

  const handleAddSrvItem = () => {
    if (!value.SRV) {
      onChange({
        ...value,
        SRV: [{ priority: 10, weight: 5, port: 80, target: "" }],
      })
      return
    }

    const newArray = [...value.SRV, { priority: 10, weight: 5, port: 80, target: "" }]
    onChange({ ...value, SRV: newArray })
  }

  const handleRemoveSrvItem = (index: number) => {
    if (!value.SRV) return

    const newArray = [...value.SRV]
    newArray.splice(index, 1)

    if (newArray.length === 0) {
      const newRecord = { ...value }
      delete newRecord.SRV
      onChange(newRecord)
      return
    }

    onChange({ ...value, SRV: newArray })
  }

  const handleUpdateCaaRecord = (index: number, field: "flags" | "tag" | "value", val: string) => {
    if (!value.CAA) return;

    const newArray = [...value.CAA];

    if (field === "value" || field === "tag") {
      newArray[index] = { ...newArray[index], [field]: val };
    } else {
      newArray[index] = { ...newArray[index], flags: Number.parseInt(val) };
    }

    handleChange({ ...value, CAA: newArray });
  };

  const handleAddCaaItem = () => {
    if (!value.CAA) {
      onChange({
        ...value,
        CAA: [{ flags: 0, tag: "issue", value: "" }],
      })
      return
    }

    const newArray = [...value.CAA, { flags: 0, tag: "issue", value: "" }]
    onChange({ ...value, CAA: newArray })
  }

  const handleRemoveCaaItem = (index: number) => {
    if (!value.CAA) return

    const newArray = [...value.CAA]
    newArray.splice(index, 1)

    if (newArray.length === 0) {
      const newRecord = { ...value }
      delete newRecord.CAA
      onChange(newRecord)
      return
    }

    onChange({ ...value, CAA: newArray })
  }

  const handleUpdateDsRecord = (index: number, field: "key_tag" | "algorithm" | "digest_type" | "digest", val: string) => {
    if (!value.DS) return;

    const newArray = [...value.DS];

    if (field === "digest") {
      newArray[index] = { ...newArray[index], digest: val };
    } else {
      newArray[index] = { ...newArray[index], [field]: Number.parseInt(val) };
    }

    handleChange({ ...value, DS: newArray });
  };

  const handleAddDsItem = () => {
    if (!value.DS) {
      onChange({
        ...value,
        DS: [{ key_tag: 0, algorithm: 13, digest_type: 2, digest: "" }],
      })
      return
    }

    const newArray = [...value.DS, { key_tag: 0, algorithm: 13, digest_type: 2, digest: "" }]
    onChange({ ...value, DS: newArray })
  }

  const handleRemoveDsItem = (index: number) => {
    if (!value.DS) return

    const newArray = [...value.DS]
    newArray.splice(index, 1)

    if (newArray.length === 0) {
      const newRecord = { ...value }
      delete newRecord.DS
      onChange(newRecord)
      return
    }

    onChange({ ...value, DS: newArray })
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-purple-300">DNS Records</h3>
        <p className="text-sm text-purple-200">
          Configure the DNS records for your domain. You can add multiple record types.
        </p>
      </div>

      <div className="flex items-end gap-4">
        <div className="flex-1">
          <Label htmlFor="record-type" className="text-sm text-purple-300 mb-2 block">
            Record Type
          </Label>
          <Select value={recordType} onValueChange={(value) => setRecordType(value as RecordType)}>
            <SelectTrigger className="bg-black border-purple-500">
              <SelectValue placeholder="Select record type" />
            </SelectTrigger>
            <SelectContent className="bg-black border-purple-500">
              <SelectItem value="A">A (IPv4 Address)</SelectItem>
              <SelectItem value="AAAA">AAAA (IPv6 Address)</SelectItem>
              <SelectItem value="CNAME">CNAME (Canonical Name)</SelectItem>
              <SelectItem value="MX">MX (Mail Exchange)</SelectItem>
              <SelectItem value="TXT">TXT (Text)</SelectItem>
              <SelectItem value="URL">URL (Redirect)</SelectItem>
              <SelectItem value="NS">NS (Name Server)</SelectItem>
              <SelectItem value="SRV">SRV (Service)</SelectItem>
              <SelectItem value="CAA">CAA (Certificate Authority)</SelectItem>
              <SelectItem value="DS">DS (Delegation Signer)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <CyberButton onClick={handleAddRecord} variant="outline">
          <PlusCircle className="h-4 w-4 mr-2" />
          Add Record
        </CyberButton>
      </div>

      <div className="space-y-6">
        {/* CNAME Record */}
        {value.CNAME !== undefined && (
          <div className="p-4 border border-purple-500 rounded-md bg-black/40 relative">
            <button
              type="button"
              onClick={() => handleRemoveRecord("CNAME")}
              className="absolute top-2 right-2 text-purple-400 hover:text-red-400 transition-colors"
              aria-label="Remove CNAME record"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <h4 className="text-md font-bold text-purple-300 mb-3">CNAME Record</h4>
            <div className="space-y-2">
              <Label htmlFor="cname-value" className="text-sm text-purple-300">
                Target (e.g. username.github.io)
              </Label>
              <Input
                id="cname-value"
                value={value.CNAME}
                onChange={(e) => handleUpdateStringRecord("CNAME", e.target.value)}
                placeholder="Enter CNAME value"
                className={`bg-black border-purple-500 focus:border-purple-300 ${errors.CNAME ? "border-red-500" : ""}`}
              />
              {errors.CNAME && (
                <div className="text-red-500 text-sm flex items-center mt-1">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.CNAME[0]}
                </div>
              )}
              <p className="text-xs text-purple-400 mt-1">
                Do not include http:// or https:// in CNAME records.
              </p>
            </div>
          </div>
        )}

        {/* URL Record */}
        {value.URL !== undefined && (
          <div className="p-4 border border-purple-500 rounded-md bg-black/40 relative">
            <button
              type="button"
              onClick={() => handleRemoveRecord("URL")}
              className="absolute top-2 right-2 text-purple-400 hover:text-red-400 transition-colors"
              aria-label="Remove URL record"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <h4 className="text-md font-bold text-purple-300 mb-3">URL Record</h4>
            <div className="space-y-2">
              <Label htmlFor="url-value" className="text-sm text-purple-300">
                Target URL (e.g. https://example.com)
              </Label>
              <Input
                id="url-value"
                value={value.URL}
                onChange={(e) => handleUpdateStringRecord("URL", e.target.value)}
                placeholder="Enter URL value"
                className={`bg-black border-purple-500 focus:border-purple-300 ${errors.URL ? "border-red-500" : ""}`}
              />
              {errors.URL && (
                <div className="text-red-500 text-sm flex items-center mt-1">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.URL[0]}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TXT Record */}
        {value.TXT !== undefined && (
          <div className="p-4 border border-purple-500 rounded-md bg-black/40 relative">
            <button
              type="button"
              onClick={() => handleRemoveRecord("TXT")}
              className="absolute top-2 right-2 text-purple-400 hover:text-red-400 transition-colors"
              aria-label="Remove TXT record"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <h4 className="text-md font-bold text-purple-300 mb-3">TXT Record</h4>
            <div className="space-y-2">
              <Label htmlFor="txt-value" className="text-sm text-purple-300">
                Text Value
              </Label>
              <Input
                id="txt-value"
                value={typeof value.TXT === "string" ? value.TXT : JSON.stringify(value.TXT)}
                onChange={(e) => handleUpdateTxtRecord(e.target.value)}
                placeholder="Enter TXT value"
                className={`bg-black border-purple-500 focus:border-purple-300 ${errors.TXT ? "border-red-500" : ""}`}
              />
              <p className="text-xs text-purple-400">
                For multiple values, use JSON array format: ["value1", "value2"]
              </p>
              {errors.TXT && (
                <div className="text-red-500 text-sm flex items-center mt-1">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.TXT[0]}
                </div>
              )}
            </div>
          </div>
        )}

        {/* A Record */}
        {value.A !== undefined && (
          <div className="p-4 border border-purple-500 rounded-md bg-black/40 relative">
            <button
              type="button"
              onClick={() => handleRemoveRecord("A")}
              className="absolute top-2 right-2 text-purple-400 hover:text-red-400 transition-colors"
              aria-label="Remove A record"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <h4 className="text-md font-bold text-purple-300 mb-3">A Record (IPv4)</h4>
            <div className="space-y-4">
              {value.A.map((ip, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Input
                      value={ip}
                      onChange={(e) => handleUpdateArrayRecord("A", index, e.target.value)}
                      placeholder="Enter IPv4 address"
                      className={`bg-black border-purple-500 focus:border-purple-300 ${
                        errors.A && errors.A[index] ? "border-red-500" : ""
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveArrayItem("A", index)}
                      className="text-purple-400 hover:text-red-400 transition-colors"
                      aria-label="Remove IP address"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {errors.A && errors.A[index] && (
                    <div className="text-red-500 text-sm flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errors.A[index]}
                    </div>
                  )}
                </div>
              ))}
              <CyberButton onClick={() => handleAddArrayItem("A")} variant="ghost" className="w-full">
                <PlusCircle className="h-4 w-4 mr-2" />
                Add IP Address
              </CyberButton>
              <p className="text-xs text-purple-400 mt-1">
                Example: 192.0.2.1
              </p>
            </div>
          </div>
        )}

        {/* AAAA Record */}
        {value.AAAA !== undefined && (
          <div className="p-4 border border-purple-500 rounded-md bg-black/40 relative">
            <button
              type="button"
              onClick={() => handleRemoveRecord("AAAA")}
              className="absolute top-2 right-2 text-purple-400 hover:text-red-400 transition-colors"
              aria-label="Remove AAAA record"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <h4 className="text-md font-bold text-purple-300 mb-3">AAAA Record (IPv6)</h4>
            <div className="space-y-4">
              {value.AAAA.map((ip, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={ip}
                    onChange={(e) => handleUpdateArrayRecord("AAAA", index, e.target.value)}
                    placeholder="Enter IPv6 address"
                    className={`bg-black border-purple-500 focus:border-purple-300 ${
                      errors.AAAA && errors.AAAA[index] ? "border-red-500" : ""
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveArrayItem("AAAA", index)}
                    className="text-purple-400 hover:text-red-400 transition-colors"
                    aria-label="Remove IP address"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <CyberButton onClick={() => handleAddArrayItem("AAAA")} variant="ghost" className="w-full">
                <PlusCircle className="h-4 w-4 mr-2" />
                Add IPv6 Address
              </CyberButton>
            </div>
          </div>
        )}

        {/* NS Record */}
        {value.NS !== undefined && (
          <div className="p-4 border border-purple-500 rounded-md bg-black/40 relative">
            <button
              type="button"
              onClick={() => handleRemoveRecord("NS")}
              className="absolute top-2 right-2 text-purple-400 hover:text-red-400 transition-colors"
              aria-label="Remove NS record"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <h4 className="text-md font-bold text-purple-300 mb-3">NS Record</h4>
            <div className="space-y-4">
              {value.NS.map((ns, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={ns}
                    onChange={(e) => handleUpdateArrayRecord("NS", index, e.target.value)}
                    placeholder="Enter nameserver"
                    className={`bg-black border-purple-500 focus:border-purple-300 ${
                      errors.NS && errors.NS[index] ? "border-red-500" : ""
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveArrayItem("NS", index)}
                    className="text-purple-400 hover:text-red-400 transition-colors"
                    aria-label="Remove nameserver"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <CyberButton onClick={() => handleAddArrayItem("NS")} variant="ghost" className="w-full">
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Nameserver
              </CyberButton>
            </div>
            <p className="text-xs text-purple-400 mt-2">
              Note: NS records are only given out in specific cases. Please refer to the documentation.
            </p>
          </div>
        )}

        {/* MX Record */}
        {value.MX !== undefined && (
          <div className="p-4 border border-purple-500 rounded-md bg-black/40 relative">
            <button
              type="button"
              onClick={() => handleRemoveRecord("MX")}
              className="absolute top-2 right-2 text-purple-400 hover:text-red-400 transition-colors"
              aria-label="Remove MX record"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <h4 className="text-md font-bold text-purple-300 mb-3">MX Record</h4>
            <div className="space-y-4">
              {(value.MX as any[]).map((mx, index) => (
                <div key={index} className="space-y-2 p-3 border border-purple-500/30 rounded-md">
                  <div className="flex items-center justify-between">
                    <h5 className="text-sm font-medium text-purple-300">Mail Server #{index + 1}</h5>
                    <button
                      type="button"
                      onClick={() => handleRemoveMxItem(index)}
                      className="text-purple-400 hover:text-red-400 transition-colors"
                      aria-label="Remove mail server"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-3">
                      <Label htmlFor={`mx-target-${index}`} className="text-sm text-purple-300 mb-1 block">
                        Target
                      </Label>
                      <Input
                        id={`mx-target-${index}`}
                        value={typeof mx === "string" ? mx : mx.target}
                        onChange={(e) => handleUpdateMxRecord(index, "target", e.target.value)}
                        placeholder="e.g. mail.example.com"
                        className={`bg-black border-purple-500 focus:border-purple-300 ${
                          errors.MX && errors.MX[index] ? "border-red-500" : ""
                        }`}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`mx-priority-${index}`} className="text-sm text-purple-300 mb-1 block">
                        Priority
                      </Label>
                      <Input
                        id={`mx-priority-${index}`}
                        type="number"
                        value={typeof mx === "string" ? "10" : mx.priority.toString()}
                        onChange={(e) => handleUpdateMxRecord(index, "priority", e.target.value)}
                        placeholder="10"
                        className={`bg-black border-purple-500 focus:border-purple-300 ${
                          errors.MX && errors.MX[index] ? "border-red-500" : ""
                        }`}
                      />
                    </div>
                  </div>
                </div>
              ))}
              <CyberButton onClick={handleAddMxItem} variant="ghost" className="w-full">
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Mail Server
              </CyberButton>
            </div>
          </div>
        )}

        {/* SRV Record */}
        {value.SRV !== undefined && (
          <div className="p-4 border border-purple-500 rounded-md bg-black/40 relative">
            <button
              type="button"
              onClick={() => handleRemoveRecord("SRV")}
              className="absolute top-2 right-2 text-purple-400 hover:text-red-400 transition-colors"
              aria-label="Remove SRV record"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <h4 className="text-md font-bold text-purple-300 mb-3">SRV Record</h4>
            <div className="space-y-4">
              {value.SRV.map((srv, index) => (
                <div key={index} className="space-y-2 p-3 border border-purple-500/30 rounded-md">
                  <div className="flex items-center justify-between">
                    <h5 className="text-sm font-medium text-purple-300">Service #{index + 1}</h5>
                    <button
                      type="button"
                      onClick={() => handleRemoveSrvItem(index)}
                      className="text-purple-400 hover:text-red-400 transition-colors"
                      aria-label="Remove service"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`srv-target-${index}`} className="text-sm text-purple-300 mb-1 block">
                        Target
                      </Label>
                      <Input
                        id={`srv-target-${index}`}
                        value={srv.target}
                        onChange={(e) => handleUpdateSrvRecord(index, "target", e.target.value)}
                        placeholder="e.g. service.example.com"
                        className={`bg-black border-purple-500 focus:border-purple-300 ${
                          errors.SRV && errors.SRV[index] ? "border-red-500" : ""
                        }`}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`srv-port-${index}`} className="text-sm text-purple-300 mb-1 block">
                        Port
                      </Label>
                      <Input
                        id={`srv-port-${index}`}
                        type="number"
                        value={srv.port.toString()}
                        onChange={(e) => handleUpdateSrvRecord(index, "port", e.target.value)}
                        placeholder="80"
                        className={`bg-black border-purple-500 focus:border-purple-300 ${
                          errors.SRV && errors.SRV[index] ? "border-red-500" : ""
                        }`}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`srv-priority-${index}`} className="text-sm text-purple-300 mb-1 block">
                        Priority
                      </Label>
                      <Input
                        id={`srv-priority-${index}`}
                        type="number"
                        value={srv.priority.toString()}
                        onChange={(e) => handleUpdateSrvRecord(index, "priority", e.target.value)}
                        placeholder="10"
                        className={`bg-black border-purple-500 focus:border-purple-300 ${
                          errors.SRV && errors.SRV[index] ? "border-red-500" : ""
                        }`}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`srv-weight-${index}`} className="text-sm text-purple-300 mb-1 block">
                        Weight
                      </Label>
                      <Input
                        id={`srv-weight-${index}`}
                        type="number"
                        value={srv.weight.toString()}
                        onChange={(e) => handleUpdateSrvRecord(index, "weight", e.target.value)}
                        placeholder="5"
                        className={`bg-black border-purple-500 focus:border-purple-300 ${
                          errors.SRV && errors.SRV[index] ? "border-red-500" : ""
                        }`}
                      />
                    </div>
                  </div>
                </div>
              ))}
              <CyberButton onClick={handleAddSrvItem} variant="ghost" className="w-full">
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Service
              </CyberButton>
            </div>
          </div>
        )}

        {/* CAA Record */}
        {value.CAA !== undefined && (
          <div className="p-4 border border-purple-500 rounded-md bg-black/40 relative">
            <button
              type="button"
              onClick={() => handleRemoveRecord("CAA")}
              className="absolute top-2 right-2 text-purple-400 hover:text-red-400 transition-colors"
              aria-label="Remove CAA record"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <h4 className="text-md font-bold text-purple-300 mb-3">CAA Record</h4>
            <div className="space-y-4">
              {value.CAA.map((caa, index) => (
                <div key={index} className="space-y-2 p-3 border border-purple-500/30 rounded-md">
                  <div className="flex items-center justify-between">
                    <h5 className="text-sm font-medium text-purple-300">CAA #{index + 1}</h5>
                    <button
                      type="button"
                      onClick={() => handleRemoveCaaItem(index)}
                      className="text-purple-400 hover:text-red-400 transition-colors"
                      aria-label="Remove CAA"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor={`caa-flags-${index}`} className="text-sm text-purple-300 mb-1 block">
                        Flags
                      </Label>
                      <Input
                        id={`caa-flags-${index}`}
                        type="number"
                        value={caa.flags.toString()}
                        onChange={(e) => handleUpdateCaaRecord(index, "flags", e.target.value)}
                        placeholder="0"
                        className={`bg-black border-purple-500 focus:border-purple-300 ${
                          errors.CAA && errors.CAA[index] ? "border-red-500" : ""
                        }`}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`caa-tag-${index}`} className="text-sm text-purple-300 mb-1 block">
                        Tag
                      </Label>
                      <Select value={caa.tag} onValueChange={(value) => handleUpdateCaaRecord(index, "tag", value)}>
                        <SelectTrigger className="bg-black border-purple-500">
                          <SelectValue placeholder="Select tag" />
                        </SelectTrigger>
                        <SelectContent className="bg-black border-purple-500">
                          <SelectItem value="issue">issue</SelectItem>
                          <SelectItem value="issuewild">issuewild</SelectItem>
                          <SelectItem value="iodef">iodef</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor={`caa-value-${index}`} className="text-sm text-purple-300 mb-1 block">
                        Value
                      </Label>
                      <Input
                        id={`caa-value-${index}`}
                        value={caa.value}
                        onChange={(e) => handleUpdateCaaRecord(index, "value", e.target.value)}
                        placeholder="e.g. letsencrypt.org"
                        className={`bg-black border-purple-500 focus:border-purple-300 ${
                          errors.CAA && errors.CAA[index] ? "border-red-500" : ""
                        }`}
                      />
                    </div>
                  </div>
                </div>
              ))}
              <CyberButton onClick={handleAddCaaItem} variant="ghost" className="w-full">
                <PlusCircle className="h-4 w-4 mr-2" />
                Add CAA Record
              </CyberButton>
            </div>
          </div>
        )}

        {/* DS Record */}
        {value.DS !== undefined && (
          <div className="p-4 border border-purple-500 rounded-md bg-black/40 relative">
            <button
              type="button"
              onClick={() => handleRemoveRecord("DS")}
              className="absolute top-2 right-2 text-purple-400 hover:text-red-400 transition-colors"
              aria-label="Remove DS record"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <h4 className="text-md font-bold text-purple-300 mb-3">DS Record</h4>
            <div className="space-y-4">
              {value.DS.map((ds, index) => (
                <div key={index} className="space-y-2 p-3 border border-purple-500/30 rounded-md">
                  <div className="flex items-center justify-between">
                    <h5 className="text-sm font-medium text-purple-300">DS #{index + 1}</h5>
                    <button
                      type="button"
                      onClick={() => handleRemoveDsItem(index)}
                      className="text-purple-400 hover:text-red-400 transition-colors"
                      aria-label="Remove DS"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`ds-key-tag-${index}`} className="text-sm text-purple-300 mb-1 block">
                        Key Tag
                      </Label>
                      <Input
                        id={`ds-key-tag-${index}`}
                        type="number"
                        value={ds.key_tag.toString()}
                        onChange={(e) => handleUpdateDsRecord(index, "key_tag", e.target.value)}
                        placeholder="2371"
                        className={`bg-black border-purple-500 focus:border-purple-300 ${
                          errors.DS && errors.DS[index] ? "border-red-500" : ""
                        }`}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`ds-algorithm-${index}`} className="text-sm text-purple-300 mb-1 block">
                        Algorithm
                      </Label>
                      <Input
                        id={`ds-algorithm-${index}`}
                        type="number"
                        value={ds.algorithm.toString()}
                        onChange={(e) => handleUpdateDsRecord(index, "algorithm", e.target.value)}
                        placeholder="13"
                        className={`bg-black border-purple-500 focus:border-purple-300 ${
                          errors.DS && errors.DS[index] ? "border-red-500" : ""
                        }`}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`ds-digest-type-${index}`} className="text-sm text-purple-300 mb-1 block">
                        Digest Type
                      </Label>
                      <Input
                        id={`ds-digest-type-${index}`}
                        type="number"
                        value={ds.digest_type.toString()}
                        onChange={(e) => handleUpdateDsRecord(index, "digest_type", e.target.value)}
                        placeholder="2"
                        className={`bg-black border-purple-500 focus:border-purple-300 ${
                          errors.DS && errors.DS[index] ? "border-red-500" : ""
                        }`}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`ds-digest-${index}`} className="text-sm text-purple-300 mb-1 block">
                        Digest
                      </Label>
                      <Input
                        id={`ds-digest-${index}`}
                        value={ds.digest}
                        onChange={(e) => handleUpdateDsRecord(index, "digest", e.target.value)}
                        placeholder="Enter digest value"
                        className={`bg-black border-purple-500 focus:border-purple-300 ${
                          errors.DS && errors.DS[index] ? "border-red-500" : ""
                        }`}
                      />
                    </div>
                  </div>
                </div>
              ))}
              <CyberButton onClick={handleAddDsItem} variant="ghost" className="w-full">
                <PlusCircle className="h-4 w-4 mr-2" />
                Add DS Record
              </CyberButton>
            </div>
            <p className="text-xs text-purple-400 mt-2">
              Note: DS records can only be used in combination with NS records, which are used for DNSSEC.
            </p>
          </div>
        )}
      </div>
      
      {/* Validation Errors Summary - show if any errors exist */}
      {Object.keys(errors).length > 0 && (
        <div className="p-4 border border-red-500 rounded-md bg-red-500/10 mt-6">
          <h4 className="text-md font-bold text-red-400 mb-2 flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            Validation Errors
          </h4>
          <ul className="text-sm text-red-300 list-disc list-inside space-y-1">
            {Object.entries(errors).flatMap(([type, typeErrors]) => 
              typeErrors.filter(Boolean).map((error, i) => (
                <li key={`${type}-${i}`}>{type}: {error}</li>
              ))
            )}
          </ul>
          <p className="text-xs text-red-300 mt-2">
            Please fix these errors before submitting your domain.
          </p>
        </div>
      )}
    </div>
  )
}
