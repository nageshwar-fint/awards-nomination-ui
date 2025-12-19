import { useForm, useFieldArray } from 'react-hook-form'
import toast from 'react-hot-toast'
import { apiRequest } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { handleError } from '../utils/errorHandler'


export default function Nominations({ criteria, cycleId }) {
  const { register, handleSubmit, control } = useForm({
    defaultValues: { scores: criteria.map(c => ({ criteria_id: c.id })) }
  })

  const { fields } = useFieldArray({ control, name: 'scores' })
  const { user } = useAuth()

  console.log(user)

  const onSubmit = async (data) => {
    try {
      await apiRequest('/nominations', {
        method: 'POST',
        body: JSON.stringify({ cycle_id: cycleId, ...data })
      })
      toast.success('Nomination submitted')
    } catch (e) {
      handleError(e, 'Failed to submit nomination', 'nomination-submit')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {fields.map((field, i) => (
        <div key={field.id}>
          <input type="number" {...register(`scores.${i}.score`)} />
        </div>
      ))}
      <button className="btn btn-primary">Submit</button>
    </form>
  )
}
